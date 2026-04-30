// Path: backend/src/models/Download.js
const mongoose = require('mongoose');

const downloadSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['downloaded', 'processing', 'processed', 'failed'],
      default: 'downloaded',
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

downloadSchema.index({ fileName: 1, createdAt: -1 });

module.exports = mongoose.model('Download', downloadSchema);
