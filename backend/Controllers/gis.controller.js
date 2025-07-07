import { Db } from "mongodb";
import { GeoUnit } from "../Models/geoUnit.model.js"; // Import the GeoUnit model
import { PedestrianPassage } from "../Models/pedestrianPassage.model.js"; // Import the PedestrianPassage model
import { Station } from "../Models/station.model.js"; // Import the Station model
import * as turf from "@turf/turf";

export const updateDependentAttributes = async (request, reply) => {
  try {
  } catch (error) {
    console.error("Error calculating proximity score:", error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

export const calculateProximityScore = async (request, reply) => {
  try {
    const geoUnits = await GeoUnit.find({});
    const stations = await Station.find({});

    const bufferDistances = {
      green: 0.4, // Near
      yellow: 0.8, // Medium
      red: 1.2, // Far
    };

    // Create buffers for each station (and each coverage level)
    const buffers = { green: [], yellow: [], red: [] };

    // Generate buffers for each station
    stations.forEach((station) => {
      buffers.green.push(
        turf.buffer(
          turf.point(station.location.coordinates),
          bufferDistances.green,
          {
            units: "kilometers",
          }
        )
      );
      buffers.yellow.push(
        turf.buffer(
          turf.point(station.location.coordinates),
          bufferDistances.yellow,
          {
            units: "kilometers",
          }
        )
      );
      buffers.red.push(
        turf.buffer(
          turf.point(station.location.coordinates),
          bufferDistances.red,
          {
            units: "kilometers",
          }
        )
      );
    });

    // Function to safely union multiple buffers
    const unionBuffers = (bufferArray) => {
      if (bufferArray.length > 1) {
        return turf.union(turf.featureCollection([...bufferArray])); // Union all buffers
      }
      return bufferArray[0]; // If there's only one buffer, return it as is
    };

    // Union all buffers
    const greenUnion = unionBuffers(buffers.green);
    const yellowUnion = unionBuffers(buffers.yellow);
    const yellowWithoutGreen = turf.difference(
      turf.featureCollection([yellowUnion, greenUnion])
    );
    const redUnion = unionBuffers(buffers.red);
    const redWithoutYellowAndGreen = turf.difference(
      turf.featureCollection([redUnion, yellowUnion])
    );
    const redWithoutGreen = turf.difference(
      turf.featureCollection([redWithoutYellowAndGreen, greenUnion])
    );

    // Iterate through each geo unit to calculate proximity score
    for (const geoUnit of geoUnits) {
      if (!geoUnit) continue;

      const geoPoly = turf.polygon(geoUnit.location.coordinates);
      let totalScore = 0;

      // Calculate areas of intersection between geoUnit and each buffer zone
      const greenIntersection = turf.intersect(
        turf.featureCollection([geoPoly, greenUnion])
      );
      const yellowIntersection = turf.intersect(
        turf.featureCollection([geoPoly, yellowWithoutGreen])
      );
      const redIntersection = turf.intersect(
        turf.featureCollection([geoPoly, redWithoutGreen])
      );

      // Calculate the areas of each intersection
      const greenArea = greenIntersection ? turf.area(greenIntersection) : 0;
      const yellowArea = yellowIntersection ? turf.area(yellowIntersection) : 0;
      const redArea = redIntersection ? turf.area(redIntersection) : 0;

      // Apply the scoring formula: green * 3 + yellow * 2 + red * 1
      totalScore = greenArea * 3 + yellowArea * 2 + redArea * 1;

      // Get the maximum possible area (the whole geo unit)
      const maxArea = turf.area(geoPoly) * 3; // Max possible score would be all green, yellow, and red

      // Normalize the score by dividing it by the max area
      const normalizedScore = totalScore / maxArea;

      // Store the normalized score for the geo unit
      geoUnit.proximityScore = normalizedScore;

      // Save the updated geo unit
      await geoUnit.save();
    }

    return reply.send({ message: "Proximity scores calculated successfully." });
  } catch (error) {
    console.error("Error calculating proximity score:", error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

export const uploadGeoJSON = async (request, reply) => {
  try {
    const { geoJSON, dataSource } = request.body; // Get uploadType and geoJSON from the request body

    const transformedData = geoJSON.features.map((feature) => ({
      osm_id: feature.properties["@id"],
      source: dataSource,
      name: feature.properties.name,
      postalCode: feature.properties.postal_code || "N/A",
      location: feature.geometry,
      area: turf.area(feature.geometry) / 1_000_000,
      population: feature.properties.population || 0,
    }));

    for (const feature of transformedData) {
      await GeoUnit.findOneAndUpdate(
        { osm_id: feature.osm_id },
        { $set: feature },
        { upsert: true, new: true }
      );
    }

    return reply
      .code(201)
      .send({ message: "GeoJSON data uploaded successfully!" });
  } catch (error) {
    console.error("Error uploading GeoJSON:", error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

export const uploadPedestrianGeoJSON = async (request, reply) => {
  try {
    const { geoJSON, dataSource, passageType } = request.body;

    const transformedData = geoJSON.features.map((feature) => {
      const { geometry } = feature;
      let location = null;

      if (geometry.type === "Point") {
        // Use the coordinates directly
        location = {
          type: "Point",
          coordinates: geometry.coordinates,
        };
      } else {
        // Calculate centroid and use it as the location
        const centroid = turf.centroid(geometry);
        location = {
          type: "Point",
          coordinates: centroid.geometry.coordinates,
        };
      }

      return {
        osm_id: feature.properties["@id"],
        source: dataSource,
        type: passageType,
        location: location ? location : null, // Add coordinates to location
      };
    });

    // Loop through each feature and save as a PedestrianPassage
    for (const feature of transformedData) {
      await PedestrianPassage.findOneAndUpdate(
        { osm_id: feature.osm_id },
        { $set: feature },
        { upsert: true, new: true }
      );
    }

    return reply
      .code(201)
      .send({ message: "GeoJSON data uploaded successfully!" });
  } catch (error) {
    console.error("Error uploading GeoJSON:", error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

export const uploadStationGeoJSON = async (request, reply) => {
  try {
    const { geoJSON, dataSource, transportType, stationType, multiModal } =
      request.body;

    const transformedData = geoJSON.features.map((feature) => {
      const { geometry } = feature;
      let location = null;

      if (geometry.type === "Point") {
        // Use the coordinates directly
        location = {
          type: "Point",
          coordinates: geometry.coordinates,
        };
      } else {
        // Calculate centroid and use it as the location
        const centroid = turf.centroid(geometry);
        location = {
          type: "Point",
          coordinates: centroid.geometry.coordinates,
        };
      }

      return {
        osm_id: feature.properties["@id"],
        source: dataSource,
        name: feature.properties.name || "N/A",
        transportType: transportType,
        stationType: stationType,
        multiModal: multiModal,
        location: location ? location : null, // Add coordinates to location
      };
    });

    // Check for duplicates
    for (const feature of transformedData) {
      await Station.findOneAndUpdate(
        { osm_id: feature.osm_id },
        { $set: feature },
        { upsert: true, new: true }
      );
    }

    return reply
      .code(201)
      .send({ message: "GeoJSON data uploaded successfully!" });
  } catch (error) {
    console.error("Error uploading GeoJSON:", error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

export const getGeoUnits = async (request, reply) => {
  try {
    // Fetch all GeoUnit documents from the database
    const geoUnits = await GeoUnit.find({});

    // If there are no geoUnits, send a 404 Not Found response
    if (geoUnits.length === 0) {
      return reply.code(404).send({ message: "No GeoUnits found" });
    }

    // Send the geoUnits data in the response
    return reply.code(200).send(geoUnits);
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error getting GeoUnits:", error);

    // Return an error response with status code 500
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

export const getStations = async (request, reply) => {
  try {
    // Fetch all GeoUnit documents from the database
    const stations = await Station.find({});

    // If there are no geoUnits, send a 404 Not Found response
    if (stations.length === 0) {
      return reply.code(404).send({ message: "No Station found" });
    }

    // Send the geoUnits data in the response
    return reply.code(200).send(stations);
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error getting Stations:", error);

    // Return an error response with status code 500
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

export const getPedestrianPassages = async (request, reply) => {
  try {
    // Fetch all GeoUnit documents from the database
    const passages = await PedestrianPassage.find({});

    // If there are no geoUnits, send a 404 Not Found response
    if (passages.length === 0) {
      return reply.code(404).send({ message: "No PedestrianPassage found" });
    }

    // Send the geoUnits data in the response
    return reply.code(200).send(passages);
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error getting Stations:", error);

    // Return an error response with status code 500
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

export const uploadWays = async (request, reply) => {
  try {
    const { geoJSON, name, wayType } = request.body;

    // Find the geoUnit by postalCode to get the city boundary
    const geoUnits = await GeoUnit.find({ name: name });
    if (!geoUnits) {
      return reply.code(404).send({ error: "GeoUnit not found" });
    }

    let totalWayLength = 0;

    const sidewalks = geoJSON.features.map((feature) => {
      if (feature.geometry.type !== "LineString") {
        throw new Error("Invalid geometry type. Only LineString is supported.");
      }

      const length = turf.length(feature.geometry);

      if (wayType === "sidewalk") totalWayLength += length;

      return {
        osm_id: feature.properties["@id"],
        sidewalkType: feature.properties.sidewalk || "separate",
        location: feature.geometry,
      };
    });

    // Process each road in the geoJSON
    const roads = geoJSON.features.map((feature) => {
      if (feature.geometry.type !== "LineString") {
        throw new Error("Invalid geometry type. Only LineString is supported.");
      }

      const length = turf.length(feature.geometry);

      if (wayType === "road") {
        totalWayLength += length;
      }

      const hasSidewalk =
        (feature.properties.sidewalk && feature.properties.sidewalk !== "no") ||
        (feature.properties["sidewalk:right"] &&
          feature.properties["sidewalk:right"] !== "no") ||
        (feature.properties["sidewalk:left"] &&
          feature.properties["sidewalk:left"] !== "no") ||
        (feature.properties["sidewalk:both"] &&
          feature.properties["sidewalk:both"] !== "no") ||
        feature.properties.footway === "sidewalk";

      return {
        osm_id: feature.properties["@id"],
        roadType: feature.properties.highway,
        location: feature.geometry,
        hasSidewalk: hasSidewalk,
      };
    });

    const validRoads = roads.filter((road) => road !== null);
    const validSidewalks = sidewalks.filter((sidewalk) => sidewalk !== null);

    for (const geoUnit of geoUnits) {
      if (wayType === "road") {
        // Assuming validRoads and totalRoadLength are already calculated
        geoUnit.roadsWithin = {
          roads: validRoads, // Assign the list of valid roads
          roadLength: totalWayLength, // Assign the total length of the roads
        };

        // Save the updated geoUnit object
        await geoUnit.save();
      } else if (wayType === "sidewalk") {
        geoUnit.sidewalksWithin = {
          sidewalks: validSidewalks,
          sidewalkLength: totalWayLength,
        };

        await geoUnit.save();
      }
    }

    return reply.code(200).send({ success: true, roads: validRoads });
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error uploading roads:", error);

    // Return an error response with status code 500
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};
