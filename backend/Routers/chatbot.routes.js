import {
  getAugmentedResponse,
  getInsights,
  getPolicyRecommendation,
  getRelevantResponse,
} from "../Controllers/chatbot.controller.js";

async function chatBotRoutes(fastify) {
  fastify.post("/insights", getInsights);
  fastify.post("/policy", getPolicyRecommendation);
  fastify.post("/chat", getRelevantResponse);
  fastify.post("/rag", getAugmentedResponse);
}

export default chatBotRoutes;
