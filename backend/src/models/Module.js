// Path: backend/src/models/Module.js
const mongoose = require('mongoose');

const misconceptionSchema = new mongoose.Schema({
  gapType: {
    type: String,
    enum: ['conceptual', 'procedural', 'careless'],
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  story: {
    type: [String],
    default: [],
  },
}, { _id: false });

const questionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  correctAnswer: {
    type: String,
    required: true,
  },
  explanation: {
    type: String,
    default: '',
  },
  concept: {
    type: String,
    default: '',
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  misconceptions: [misconceptionSchema],
}, { _id: false });

const moduleSchema = new mongoose.Schema({
  moduleId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  subject: {
    type: String,
    required: true,
  },
  chapter: {
    type: String,
    required: true,
  },
  grade: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  topic: {
    type: String,
    default: '',
  },
  questions: [questionSchema],
  version: {
    type: Number,
    default: 1,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Module', moduleSchema);
