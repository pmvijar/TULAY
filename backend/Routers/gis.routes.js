import {
  calculateProximityScore,
  getGeoUnits,
  getPedestrianPassages,
  getStations,
  uploadGeoJSON,
  uploadPedestrianGeoJSON,
  uploadStationGeoJSON,
  uploadWays,
} from "../Controllers/gis.controller.js";

async function GISRoutes(fastify) {
  fastify.post("/upload-geojson", uploadGeoJSON);
  fastify.post("/upload-station", uploadStationGeoJSON);
  fastify.post("/upload-passage", uploadPedestrianGeoJSON);
  fastify.post("/upload-ways", uploadWays);

  fastify.post("/calc-proximity", calculateProximityScore);

  fastify.post("/get-geounits", getGeoUnits);
  fastify.post("/get-stations", getStations);
  fastify.post("/get-passages", getPedestrianPassages);
}

export default GISRoutes;
