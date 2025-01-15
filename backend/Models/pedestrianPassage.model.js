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

const pedestrianPassageSchema = new mongoose.Schema({
  source: { type: String, required: true },
  location: pointSchema,
  type: {
    type: String,
    enum: ["footbridge", "underpass", "crosswalk"],
    required: true,
  },
});

pedestrianPassageSchema.index({ location: "2dsphere" });

export const PedestrianPassage = mongoose.model(
  "PedestrianPassage",
  pedestrianPassageSchema
);
