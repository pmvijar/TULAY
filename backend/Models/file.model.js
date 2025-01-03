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
