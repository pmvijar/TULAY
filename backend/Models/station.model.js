import mongoose from "mongoose";

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Point"],
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});

const stationSchema = new mongoose.Schema({
  source: { type: String, required: true },
  name: { type: String, required: false }, // Some stops might not have official names
  transportType: {
    // mode of transport
    type: [String],
    enum: ["bus", "train", "jeepney"],
    required: true,
  },
  stationType: {
    type: String,
    enum: ["stop", "station", "terminal"],
    required: true,
  },
  multiModal: {
    type: Boolean,
    required: true,
  },
  location: pointSchema,
});

stationSchema.index({ location: "2dsphere" });

export const Station = mongoose.model("Station", stationSchema);
