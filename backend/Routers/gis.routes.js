import { uploadGeoJSON } from "../Controllers/gis.controller.js";

async function GISRoutes(fastify) {
  fastify.post("/upload-geojson", uploadGeoJSON);
}

export default GISRoutes;
