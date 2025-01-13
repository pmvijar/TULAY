import mongoose from "mongoose";

const polygonSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Polygon"],
    required: true,
  },
  coordinates: {
    type: [[[Number]]], // Array of arrays of arrays of numbers
    required: true,
  },
});

const geoUnitSchema = new mongoose.Schema({
  source: { type: String, required: true },
  name: { type: String, required: true },
  postalCode: { type: String, required: true },
  location: polygonSchema,
  area: { type: Number, required: false },
  population: { type: Number, required: false },
});

// 2D-sphere indexing for efficient geospatial query
geoUnitSchema.index({ location: "2dsphere" });

export const GeoUnit = mongoose.model("GeoUnit", geoUnitSchema);

/*
import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalFilename: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  dataTypes: [{ type: String }],
  fileContent: { type: String, required: true },
  chunkIndex: { type: Number, required: true },
  uploadDate: { type: Date, default: Date.now }
});

// Add an index for efficient querying
fileSchema.index({ originalFilename: 1, chunkIndex: 1 });

export const File = mongoose.model('File', fileSchema);

*/
