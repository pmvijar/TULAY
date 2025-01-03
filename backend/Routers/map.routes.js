import { 
  getGPSData, 
  getPeakHours,
  uploadFile, 
  getRoute,
  getFile,
  getPassengerLoadData,
  getBoardingAlightingHeatmap,
  getBoardingAlightingStackedBar,
  getGPSSpeedLineChart
} from "../Controllers/map.controller.js";

async function mapRoutes(fastify) {

  fastify.post('/gps-data', getGPSData);
  fastify.post('/get-peak-hours', getPeakHours);
  fastify.post('/get-route', getRoute);
  fastify.post('/upload', uploadFile);
  fastify.get('/file/:filename', getFile);

  // New routes for passenger load and heatmap /get-GPS-speed-line-chart
  fastify.post("/passenger-load", getPassengerLoadData);
  fastify.post("/boarding-alighting-heatmap", getBoardingAlightingHeatmap);
  fastify.post(
    "/boarding-alighting-stacked-bar",
    getBoardingAlightingStackedBar
  );
  fastify.post("/get-GPS-speed-line-chart", getGPSSpeedLineChart);
}

export default mapRoutes;
