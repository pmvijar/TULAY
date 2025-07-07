import { File } from "../Models/file.model.js";
import csv from "csv-parser";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import util from "util";

const pump = util.promisify(pipeline);

const ROWS_PER_CHUNK = 10000; // Adjust this value as needed

// Helper function to convert "TRUE"/"FALSE" strings to boolean values
const stringToBoolean = (value) => value.toUpperCase() === "TRUE";
// Define the EDSA stations array with station names and coordinates
const edsaStations = [
  { name: "Monumento", lat: 14.65916384111359, lon: 120.98573142941851 },
  { name: "Bagong Barrio", lat: 14.659828134168453, lon: 120.99912101589535 },
  { name: "Roosevelt", lat: 14.658167397753804, lon: 121.01748878195974 },
  { name: "North Avenue", lat: 14.65318511296888, lon: 121.03413993437326 },
  { name: "Quezon Ave", lat: 14.644714968865955, lon: 121.0391181139608 },
  { name: "Nepa-Q Mart", lat: 14.631593903622614, lon: 121.04701453675483 },
  { name: "Main Ave", lat: 14.616977109846092, lon: 121.06160575278732 },
  { name: "Santolan", lat: 14.609982696962746, lon: 121.05787574923397 },
  { name: "Ortigas", lat: 14.589832685829805, lon: 121.05716125602541 },
  { name: "Guadalupe", lat: 14.57101110076029, lon: 121.05032201969453 },
  { name: "Buendia", lat: 14.558856285663646, lon: 121.03502097922416 },
  { name: "Ayala", lat: 14.552848486249191, lon: 121.03328878610569 },
  { name: "Tramo", lat: 14.540273493066225, lon: 121.01077027556548 },
  { name: "Taft", lat: 14.5412515737729, lon: 120.99979971914846 },
  {
    name: "Diosdado Macapagal Blvd",
    lat: 14.540133766897473,
    lon: 120.99287094667456,
  },
  { name: "PITX/MOA", lat: 14.537339224963862, lon: 120.98377693280254 },
];

// Helper function to convert array of objects to CSV string
const objectsToCSV = (data) => {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map((obj) => Object.values(obj).join(","));
  return `${headers}\n${rows.join("\n")}`;
};

export const getPassengerLoadData = async (request, reply) => {
  try {
    const { location } = request.body;

    const locationRegex = new RegExp(location, "i");

    const files = await File.find({
      originalFilename: locationRegex,
    }).sort({ chunkIndex: 1 });
    if (files.length === 0) {
      return reply
        .code(404)
        .send({ error: "No files found for the specified location" });
    }

    let formattedData = [];
    let isWithinTimeRange = false;
    let lastTimestamp = null;
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    let prevLat = null;
    let prevLon = null;
    let routeTallies = {};
    let driverRoutes = {};
    let pastdriver = null;
    let currentDriverRoute = {};

    for (const file of files) {
      const fileContent = JSON.parse(file.fileContent);

      for (const row of fileContent) {
        const timestamp = new Date(row.timeStamp);
        const driver = row.driver || "Unknown";

        if (isNaN(timestamp)) {
          continue;
        }
        if (
          !lastTimestamp ||
          timestamp.getTime() - lastTimestamp.getTime() >= fiveMinutes ||
          pastdriver != driver
        ) {
          const lat = parseFloat(row.latitude);
          const lon = parseFloat(row.longitude);

          // Determine route
          let route = row.route;
          if (route !== "Northbound" && route !== "Southbound") {
            if (prevLat !== null && prevLon !== null) {
              const firstStation = edsaStations[0];
              const lastStation = edsaStations[edsaStations.length - 1];

              const distToFirst = Math.sqrt(
                Math.pow(lat - firstStation.lat, 2) +
                  Math.pow(lon - firstStation.lon, 2)
              );
              const distToLast = Math.sqrt(
                Math.pow(lat - lastStation.lat, 2) +
                  Math.pow(lon - lastStation.lon, 2)
              );

              const prevDistToFirst = Math.sqrt(
                Math.pow(prevLat - firstStation.lat, 2) +
                  Math.pow(prevLon - firstStation.lon, 2)
              );
              const prevDistToLast = Math.sqrt(
                Math.pow(prevLat - lastStation.lat, 2) +
                  Math.pow(prevLon - lastStation.lon, 2)
              );

              if (
                distToFirst < prevDistToFirst &&
                distToLast > prevDistToLast
              ) {
                route = "Northbound";
              } else if (
                distToFirst > prevDistToFirst &&
                distToLast < prevDistToLast
              ) {
                route = "Southbound";
              }
            }
          }

          // Update route tallies
          if (!routeTallies[driver]) {
            routeTallies[driver] = { Northbound: 0, Southbound: 0 };
          }
          if (route === "Northbound" || route === "Southbound") {
            routeTallies[driver][route]++;
          }

          // Determine the most common route for the driver
          if (
            !driverRoutes[driver] ||
            routeTallies[driver][route] >
              routeTallies[driver][driverRoutes[driver]]
          ) {
            driverRoutes[driver] = route;
          }

          // If route is still unknown, use the most common route for the driver
          if (route !== "Northbound" && route !== "Southbound") {
            route = driverRoutes[driver] || "Unknown";
          }

          // Update current driver route
          if (route === "Northbound" || route === "Southbound") {
            currentDriverRoute[driver] = route;
          }

          // Update previous unknown routes
          if (currentDriverRoute[driver]) {
            for (let i = formattedData.length - 1; i >= 0; i--) {
              if (
                formattedData[i].driver === driver &&
                formattedData[i].route === "Unknown"
              ) {
                formattedData[i].route = currentDriverRoute[driver];
              } else {
                break;
              }
            }
          }

          formattedData.push({
            timestamp: timestamp.toISOString(),
            passengerLoad: parseInt(row.Numpass) || 0,
            latitude: lat,
            longitude: lon,
            altitude: parseFloat(row.altitude),
            route: route,
            driver: driver,
          });
          lastTimestamp = timestamp;
          prevLat = lat;
          prevLon = lon;
          pastdriver = driver;
        }
      }

      // if (isWithinTimeRange && new Date(fileContent[fileContent.length - 1].timeStamp) > new Date(endTimestamp)) {
      //   break;
      // }
    }

    if (formattedData.length === 0) {
      return reply
        .code(404)
        .send({ error: "No data found within the specified time range" });
    }

    return reply.code(200).send(formattedData);
  } catch (error) {
    console.error("Error in getPassengerLoadData:", error);
    return reply
      .code(500)
      .send({ error: "Internal Server Error", details: error.message });
  }
};

export const getRoute = async (request, reply) => {
  try {
    const { location } = request.body;

    const locationRegex = new RegExp(location, "i");

    const files = await File.find({
      originalFilename: locationRegex,
    }).sort({ chunkIndex: 1 });
    if (files.length === 0) {
      return reply
        .code(404)
        .send({ error: "No files found for the specified location" });
    }

    let heatmapData = new Map();
    for (const file of files) {
      const fileContent = JSON.parse(file.fileContent);

      for (const row of fileContent) {
        const lat = parseFloat(row.latitude);
        const lon = parseFloat(row.longitude);
        const alt = parseFloat(row.altitude);
        const key = `${lat},${lon},${alt}`;
        heatmapData.set(key, {
          latitude: lat,
          longitude: lon,
          altitude: alt,
        });
      }
      break;
    }

    const formattedData = Array.from(heatmapData.values());
    return reply.code(200).send(formattedData);
  } catch (error) {
    console.error("Error in getPassengerLoadData:", error);
    return reply
      .code(500)
      .send({ error: "Internal Server Error", details: error.message });
  }
};

// Route: POST /getBoardingAlightingHeatmap
export const getBoardingAlightingHeatmap = async (request, reply) => {
  try {
    const { location } = request.body;

    const locationRegex = new RegExp(location, "i");

    const files = await File.find({
      originalFilename: locationRegex,
    }).sort({ chunkIndex: 1 });

    if (files.length === 0) {
      return reply
        .code(404)
        .send({ error: "No files found for the specified location" });
    }

    let heatmapData = new Map();
    let lastTimestamp = null;
    const fiveMinutes = 1000; // 5 minutes in milliseconds5 * 60 * 1000

    for (const file of files) {
      const fileContent = JSON.parse(file.fileContent);

      for (const row of fileContent) {
        const timestamp = new Date(row.timeStamp);
        const driver = row.driver || "Unknown";

        if (
          !lastTimestamp ||
          timestamp.getTime() - lastTimestamp.getTime() >= fiveMinutes
        ) {
          const lat = parseFloat(row.latitude);
          const lon = parseFloat(row.longitude);
          const alt = parseFloat(row.altitude);
          const boarded = stringToBoolean(row.Board);
          const alighted = stringToBoolean(row.Alight);

          if (boarded || alighted) {
            const key = `${lat},${lon},${alt},${timestamp}`;

            heatmapData.set(key, {
              latitude: lat,
              longitude: lon,
              altitude: alt,
              boarding: boarded,
              alighting: alighted,
            });
          }
        }
      }
    }

    const formattedData = Array.from(heatmapData.values());
    return reply.code(200).send(formattedData);
  } catch (error) {
    console.error("Error in getBoardingAlightingHeatmap:", error);
    return reply
      .code(500)
      .send({ error: "Internal Server Error", details: error.message });
  }
};

// Route: POST /boarding-alighting-heatmap
export const getBoardingAlightingStackedBar = async (request, reply) => {
  try {
    const { location } = request.body;
    const locationRegex = new RegExp(location, "i");

    const files = await File.find({
      originalFilename: locationRegex,
    }).sort({ chunkIndex: 1 });

    if (files.length === 0) {
      return reply
        .code(404)
        .send({ error: "No files found for the specified location" });
    }

    let stackedBarData = new Map();
    let days = new Map();
    for (const file of files) {
      const fileContent = JSON.parse(file.fileContent);

      for (const row of fileContent) {
        const timestamp = new Date(row.timeStamp);
        const driver = row.driver || "Unknown";
        const boarded = stringToBoolean(row.Board) ? 1 : 0;
        const alighted = stringToBoolean(row.Alight) ? 1 : 0;
        const year = timestamp.getFullYear();
        const month = timestamp.getMonth();
        const day = timestamp.getDate();
        const hour = timestamp.getHours();
        const hourDate = new Date(year, month, day, hour);
        if (!Object.keys(days).includes(`${hourDate}`)) {
          days[`${hourDate}`] = {
            totalBoarding: 0,
            totalAlighting: 0,
            totalpass: 0,
          };
        }
        if (boarded || alighted)
          stackedBarData.set(timestamp, {
            timestamp: timestamp,
            boarding: boarded,
            alighting: alighted,
            driver: driver,
            pass: parseInt(row.Pass),
          });
      }
    }
    // const Hour = 60 * 60 * 1000; // 1hr in milliseconds

    const formattedData = Array.from(stackedBarData.values());

    formattedData.forEach((data) => {
      const entryTime = data.timestamp;
      const hour = entryTime.getHours(); // Get the hour (0-23) in UTC
      const year = entryTime.getFullYear();
      const month = entryTime.getMonth();
      const day = entryTime.getDate();
      const hourDate = new Date(year, month, day, hour);
      // Update the hourly data for the corresponding hour
      days[`${hourDate}`].timestamp = hourDate.toISOString();
      days[`${hourDate}`].totalBoarding += data.boarding;
      days[`${hourDate}`].totalAlighting += data.alighting;
      days[`${hourDate}`].totalpass += data.pass;
      // hourlyData[hour].entries.push(data);
    });

    return reply.code(200).send(Object.values(days));
  } catch (error) {
    console.error("Error in getBoardingAlightingStackedBar:", error);
    return reply
      .code(500)
      .send({ error: "Internal Server Error", details: error.message });
  }
};

// Route: GET /boarding-alighting-stacked-bar
export const getGPSData = async (request, reply) => {
  try {
    const { location } = request.body;
    const locationRegex = new RegExp(location, "i");
    const files = await File.find({ originalFilename: locationRegex }).sort({
      chunkIndex: 1,
    });

    if (files.length === 0) {
      return reply
        .code(404)
        .send({ error: "No files found for the specified location" });
    }

    let formattedData = [];
    let lastTimestamp = null;
    const fiveMinutes = 60 * 1000; // 5 minutes in milliseconds
    let routeTallies = {};
    let driverRoutes = {};
    let prevLat = null;
    let prevLon = null;
    let currentDriverRoute = {};

    for (const file of files) {
      const fileContent = JSON.parse(file.fileContent);
      for (const row of fileContent) {
        const timestamp = new Date(row.timeStamp);
        const driver = row.driver || "Unknown";

        if (
          !lastTimestamp ||
          timestamp.getTime() - lastTimestamp.getTime() >= fiveMinutes
        ) {
          const lat = parseFloat(row.latitude);
          const lon = parseFloat(row.longitude);

          let route = row.route;
          if (route !== "Northbound" && route !== "Southbound") {
            if (prevLat !== null && prevLon !== null) {
              const firstStation = edsaStations[0];
              const lastStation = edsaStations[edsaStations.length - 1];

              const distToFirst = Math.sqrt(
                Math.pow(lat - firstStation.lat, 2) +
                  Math.pow(lon - firstStation.lon, 2)
              );
              const distToLast = Math.sqrt(
                Math.pow(lat - lastStation.lat, 2) +
                  Math.pow(lon - lastStation.lon, 2)
              );

              const prevDistToFirst = Math.sqrt(
                Math.pow(prevLat - firstStation.lat, 2) +
                  Math.pow(prevLon - firstStation.lon, 2)
              );
              const prevDistToLast = Math.sqrt(
                Math.pow(prevLat - lastStation.lat, 2) +
                  Math.pow(prevLon - lastStation.lon, 2)
              );

              if (
                distToFirst < prevDistToFirst &&
                distToLast > prevDistToLast
              ) {
                route = "Northbound";
              } else if (
                distToFirst > prevDistToFirst &&
                distToLast < prevDistToLast
              ) {
                route = "Southbound";
              }
            }
          }

          if (!routeTallies[driver]) {
            routeTallies[driver] = { Northbound: 0, Southbound: 0 };
          }
          if (route === "Northbound" || route === "Southbound") {
            routeTallies[driver][route]++;
            if (
              !driverRoutes[driver] ||
              routeTallies[driver][route] >
                routeTallies[driver][driverRoutes[driver]]
            ) {
              driverRoutes[driver] = route;
            }
          } else {
            route = driverRoutes[driver] || "Unknown";
          }

          // Update current driver route
          if (route === "Northbound" || route === "Southbound") {
            currentDriverRoute[driver] = route;
          }

          // Update previous unknown routes
          if (currentDriverRoute[driver]) {
            for (let i = formattedData.length - 1; i >= 0; i--) {
              if (
                formattedData[i].driver === driver &&
                formattedData[i].route === "Unknown"
              ) {
                formattedData[i].route = currentDriverRoute[driver];
              } else {
                break;
              }
            }
          }

          formattedData.push({
            longitude: lon,
            latitude: lat,
            altitude: parseFloat(row.altitude),
            timestamp: timestamp.toISOString(),
            gpsSpeed: parseFloat(row.gpsSpeed),
            route: route,
            driver: driver,
          });
          lastTimestamp = timestamp;
          prevLat = lat;
          prevLon = lon;
        }
      }
    }

    // const csvData = objectsToCSV(formattedData);
    return reply.code(200).send(formattedData);
  } catch (error) {
    console.error("Error in getGPSData:", error);
    return reply
      .code(500)
      .send({ error: "Internal Server Error", details: error.message });
  }
};

export const getPeakHours = async (request, reply) => {
  try {
    const { location, time } = request.query;
    const locationRegex = new RegExp(location, "i");

    const files = await File.find({
      originalFilename: locationRegex,
    }).sort({ chunkIndex: 1 });

    if (files.length === 0) {
      return reply
        .code(404)
        .send({ error: "No files found for the specified location" });
    }

    let stackedBarData = new Map();

    for (const file of files) {
      const fileContent = JSON.parse(file.fileContent);

      fileContent.forEach((row) => {
        const timestamp = new Date(row.timeStamp);
        const driver = row.driver || "Unknown";
        const boarded = stringToBoolean(row.Board) ? 1 : 0;
        const alighted = stringToBoolean(row.Alight) ? 1 : 0;

        if (boarded || alighted)
          stackedBarData.set(timestamp.toISOString(), {
            timestamp: timestamp,
            gpsSpeed: parseFloat(row.gpsSpeed),
          });
      });
    }
    const Hour = 60 * 60 * 1000; // 1hr in milliseconds
    const hourlyData = Array.from({ length: 24 }, () => ({
      averageSpeed: 0,
      entries: 0,
    }));

    const formattedData = Array.from(stackedBarData.values());

    formattedData.forEach((data) => {
      const entryTime = data.timestamp;
      const hour = entryTime.getHours(); // Get the hour (0-23) in UTC

      // Update the hourly data for the corresponding hour
      hourlyData[hour].averageSpeed += data.gpsSpeed;
      hourlyData[hour].entries += 1;
      // hourlyData[hour].entries.push(data);
    });

    hourlyData.forEach((hour) => {
      hourlyData[hourlyData.indexOf(hour)].averageSpeed =
        hourlyData[hourlyData.indexOf(hour)].averageSpeed /
        hourlyData[hourlyData.indexOf(hour)].entries;
      if (!hourlyData[hourlyData.indexOf(hour)].averageSpeed) {
        hourlyData[hourlyData.indexOf(hour)].averageSpeed = 0;
      }
    });

    return reply.code(200).send(hourlyData);
  } catch (error) {
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

// Route: POST /get-GPS-speed-line-chart
export const getGPSSpeedLineChart = async (request, reply) => {
  try {
    const { location } = request.body;
    const locationRegex = new RegExp(location, "i");

    const files = await File.find({
      originalFilename: locationRegex,
    }).sort({ chunkIndex: 1 });

    if (files.length === 0) {
      return reply
        .code(404)
        .send({ error: "No files found for the specified location" });
    }

    let stackedBarData = new Map();
    let days = new Map();
    for (const file of files) {
      const fileContent = JSON.parse(file.fileContent);

      for (const row of fileContent) {
        const timestamp = new Date(row.timeStamp);
        const driver = row.driver || "Unknown";
        const speed = parseFloat(row.gpsSpeed);
        const year = timestamp.getFullYear();
        const month = timestamp.getMonth();
        const day = timestamp.getDate();
        const hour = timestamp.getHours();
        const hourDate = new Date(year, month, day, hour);
        if (!Object.keys(days).includes(`${hourDate}`)) {
          days[`${hourDate}`] = {
            speed: 0,
            entries: 0,
          };
        }

        stackedBarData.set(timestamp, {
          timestamp: timestamp,
          gpsSpeed: speed,
        });
      }
    }
    // const Hour = 60 * 60 * 1000; // 1hr in milliseconds

    const formattedData = Array.from(stackedBarData.values());

    formattedData.forEach((data) => {
      const entryTime = data.timestamp;
      const hour = entryTime.getHours(); // Get the hour (0-23) in UTC
      const year = entryTime.getFullYear();
      const month = entryTime.getMonth();
      const day = entryTime.getDate();
      const hourDate = new Date(year, month, day, hour);
      if (!isNaN(hourDate)) {
        days[`${hourDate}`].timestamp = hourDate.toISOString();
        days[`${hourDate}`].speed += data.gpsSpeed;
        days[`${hourDate}`].entries += 1;
      }
      // Update the hourly data for the corresponding hour

      // hourlyData[hour].entries.push(data);
    });

    Object.keys(days).forEach((keys) => {
      days[keys].speed = days[keys].speed / days[keys].entries;
    });

    return reply.code(200).send(Object.values(days));
  } catch (error) {
    console.error("Error in getBoardingAlightingStackedBar:", error);
    return reply
      .code(500)
      .send({ error: "Internal Server Error", details: error.message });
  }
};

export const uploadFile = async (request, reply) => {
  try {
    const parts = await request.parts();

    let fileUploaded = false;
    let fileIds = [];
    let dataTypes = [];
    let totalRows = 0;
    let sampleData = [];

    for await (const part of parts) {
      if (part.file) {
        fileUploaded = true;
        let currentChunk = [];
        let chunkIndex = 0;

        await pipeline(
          Readable.from(part.file),
          csv().on("headers", (headers) => {
            dataTypes = headers;
          }),
          async function* (source) {
            for await (const data of source) {
              currentChunk.push(data);
              totalRows++;

              if (currentChunk.length >= ROWS_PER_CHUNK) {
                const chunkId = await saveChunk(
                  part.filename,
                  part.mimetype,
                  dataTypes,
                  currentChunk,
                  chunkIndex
                );
                fileIds.push(chunkId);
                currentChunk = [];
                chunkIndex++;
              }
            }
          }
        );

        // Save the last chunk if there's any data left
        if (currentChunk.length > 0) {
          const chunkId = await saveChunk(
            part.filename,
            part.mimetype,
            dataTypes,
            currentChunk,
            chunkIndex
          );
          fileIds.push(chunkId);
        }

        sampleData = currentChunk.slice(0, 5); // Store first 5 rows of last chunk as sample
      }
    }

    if (fileUploaded) {
      return reply.code(201).send({
        message: "File uploaded and stored in MongoDB successfully",
        fileIds: fileIds,
        dataTypes: dataTypes,
        totalChunks: fileIds.length,
        totalRows: totalRows,
        sampleData: sampleData,
      });
    } else {
      return reply.code(400).send({ error: "No file uploaded" });
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    return reply
      .code(500)
      .send({ error: "Internal Server Error", details: error.message });
  }
};

export const getFile = async (request, reply) => {
  try {
    const { filename } = request.params;

    // Find all chunks for the given filename
    const chunks = await File.find({ originalFilename: filename }).sort({
      chunkIndex: 1,
    });

    if (chunks.length === 0) {
      return reply.code(404).send({ error: "File not found" });
    }

    // Combine all chunks
    let combinedContent = "";
    let fileType = "";
    let dataTypes = [];

    chunks.forEach((chunk, index) => {
      if (index === 0) {
        fileType = chunk.fileType;
        dataTypes = chunk.dataTypes;
        // Add headers for CSV files
        if (fileType.includes("csv")) {
          combinedContent += dataTypes.join(",") + "\n";
        }
      }
      const chunkContent = JSON.parse(chunk.fileContent);
      chunkContent.forEach((row) => {
        if (fileType.includes("csv")) {
          combinedContent += Object.values(row).join(",") + "\n";
        } else if (fileType.includes("json")) {
          combinedContent += JSON.stringify(row) + "\n";
        }
      });
    });

    // Calculate total file size
    const totalSize = Buffer.byteLength(combinedContent);

    return reply.code(200).send({
      filename: filename,
      fileType: fileType,
      fileSize: totalSize,
      fileData: combinedContent,
      dataTypes: dataTypes,
    });
  } catch (error) {
    console.error("Error retrieving file:", error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

async function saveChunk(filename, fileType, dataTypes, data, chunkIndex) {
  const chunkContent = JSON.stringify(data);
  const newFile = new File({
    filename: `${filename}_chunk_${chunkIndex}`,
    originalFilename: filename,
    fileType: fileType,
    fileSize: Buffer.byteLength(chunkContent),
    dataTypes: dataTypes,
    fileContent: chunkContent,
    chunkIndex: chunkIndex,
  });

  try {
    await newFile.save();
    return newFile._id;
  } catch (saveError) {
    console.error(`Error saving chunk ${chunkIndex}:`, saveError);
    throw saveError;
  }
}
