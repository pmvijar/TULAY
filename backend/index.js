import dotenv from "dotenv";
import Fastify from "fastify";
import mongoose from "mongoose";
import multipart from "@fastify/multipart";
import cors from "@fastify/cors";
import mapRoutes from "./Routers/map.routes.js";
import chatBotRoutes from "./Routers/chatbot.routes.js";

dotenv.config();

// Initialize Fastify
const fastify = Fastify({
  logger: true,
});

// Register fastify-multipart to handle file uploads
fastify.register(multipart, {
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB, adjust as needed
  },
});


// Register fastify-cors to enable CORS
fastify.register(cors, {
  origin: true, // Allow access from all origins
});


// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected..."))
  .catch((err) => console.log(err));

// Register routes
fastify.register(mapRoutes);
fastify.register(chatBotRoutes);

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3001, host: "0.0.0.0" });
    fastify.log.info(`server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
