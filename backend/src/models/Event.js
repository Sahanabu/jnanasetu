// Path: backend/src/models/Event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  studentId: {
    type: String,
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    default: '',
  },
  date: {
    type: Date,
    default: Date.now,
    index: true,
  },
  topic: {
    type: String,
    default: '',
  },
  subtopic: {
    type: String,
    default: '',
  },
  questionId: {
    type: String,
    default: '',
  },
  studentAnswer: {
    type: String,
    default: '',
  },
  correctAnswer: {
    type: String,
    default: '',
  },
  gapType: {
    type: String,
    enum: ['conceptual', 'procedural', 'careless', 'unknown', 'overconfidence', null],
    default: null,
  },
  confidence: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  correct: {
    type: Boolean,
    default: false,
  },
  selfFixed: {
    type: Boolean,
    default: false,
  },
  modality: {
    type: String,
    default: 'text',
  },
  synced: {
    type: Boolean,
    default: true,
  },
});

eventSchema.index({ studentId: 1, date: -1 });
eventSchema.index({ topic: 1, gapType: 1 });

module.exports = mongoose.model('Event', eventSchema);
