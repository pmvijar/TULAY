import {
  uploadGeoJSON,
  uploadPedestrianGeoJSON,
  uploadStationGeoJSON,
} from "../Controllers/gis.controller.js";

async function GISRoutes(fastify) {
  fastify.post("/upload-geojson", uploadGeoJSON);
  fastify.post("/upload-station", uploadStationGeoJSON);
  fastify.post("/upload-passage", uploadPedestrianGeoJSON);
}

export default GISRoutes;
