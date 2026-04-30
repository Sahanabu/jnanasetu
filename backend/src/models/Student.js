// Path: backend/src/models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  grade: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  language: {
    type: String,
    enum: ['en', 'hi', 'kn'],
    default: 'en',
  },
  role: {
    type: String,
    enum: ['student', 'teacher'],
    default: 'student',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
});

studentSchema.index({ lastActive: -1 });

module.exports = mongoose.model('Student', studentSchema);
