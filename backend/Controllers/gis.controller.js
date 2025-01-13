import { GeoUnit } from "../Models/geoUnit.model.js"; // Import the GeoUnit model
import { PedestrianPassage } from "../Models/pedestrianPassage.model.js"; // Import the PedestrianPassage model
import { Station } from "../Models/station.model.js"; // Import the Station model
import mongoose from "mongoose";
import * as turf from "@turf/turf";

export const uploadGeoJSON = async (request, reply) => {
  try {
    const { geoJSON, dataSource } = request.body; // Get uploadType and geoJSON from the request body

    const transformedData = geoJSON.features.map((feature) => ({
      source: dataSource,
      name: feature.properties.name,
      postalCode: feature.properties.postal_code || "N/A",
      location: feature.geometry, // This will map the geometry directly to the location field
      area: feature.properties.area || 0, // Assuming you have area, otherwise default to 0
      population: feature.properties.population || 0, // Similarly, default population to 0 if not available
    }));

    // Loop through each feature and save as a GeoUnit
    for (const feature of transformedData) {
      const geoUnit = new GeoUnit(feature);

      // Save each GeoUnit document
      await geoUnit.save();
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
        source: dataSource,
        type: passageType,
        location: location ? location : null, // Add coordinates to location
      };
    });

    // Loop through each feature and save as a GeoUnit
    for (const feature of transformedData) {
      const pedestrianPassage = new PedestrianPassage(feature);

      // Save each GeoUnit document
      await pedestrianPassage.save();
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
        source: dataSource,
        name: feature.properties.name || "N/A",
        transportType: transportType,
        stationType: stationType,
        multiModal: multiModal,
        location: location ? location : null, // Add coordinates to location
      };
    });

    // Loop through each feature and save as a GeoUnit
    for (const feature of transformedData) {
      const station = new Station(feature);

      // Save each GeoUnit document
      await station.save();
    }

    return reply
      .code(201)
      .send({ message: "GeoJSON data uploaded successfully!" });
  } catch (error) {
    console.error("Error uploading GeoJSON:", error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};
