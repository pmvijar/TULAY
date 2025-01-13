import {
  uploadGeoJSON,
  uploadStationGeoJSON,
} from "../Controllers/gis.controller.js";

async function GISRoutes(fastify) {
  fastify.post("/upload-geojson", uploadGeoJSON);
  fastify.post("/upload-station", uploadStationGeoJSON);
}

export default GISRoutes;
