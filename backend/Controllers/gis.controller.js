import { GeoUnit } from "../Models/geoUnit.model.js"; // Import the GeoUnit model
import { PedestrianPassage } from "../Models/pedestrianPassage.model.js"; // Import the PedestrianPassage model
import { Station } from "../Models/station.model.js"; // Import the Station model
import mongoose from "mongoose";

export const uploadGeoJSON = async (request, reply) => {
  try {
    const { uploadType, geoJSON, dataSource } = request.body; // Get uploadType and geoJSON from the request body

    // Ensure the geoJSON is in valid format
    const parsedGeoJSON = geoJSON;

    let model; // Declare variable to hold the model
    const transformedData = parsedGeoJSON.features.map((feature) => ({
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
