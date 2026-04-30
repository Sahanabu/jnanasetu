// Path: backend/src/routes/students.js
const express = require('express');
const router = express.Router();
const Student = require('../models/Student');

// Create or update a student
router.post('/', async (req, res) => {
  try {
    const { studentId, name, grade, language, role } = req.body;

    if (!studentId || !name) {
      return res.status(400).json({ error: 'studentId and name are required' });
    }

    const student = await Student.findOneAndUpdate(
      { studentId },
      {
        studentId,
        name,
        grade: grade || 7,
        language: language || 'en',
        role: role || 'student',
        lastActive: new Date(),
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json(student);
  } catch (error) {
    console.error('Error creating/updating student:', error);
    res.status(500).json({ error: 'Failed to save student' });
  }
});

// Get student by ID
router.get('/:studentId', async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

// Get all students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find().sort({ lastActive: -1 });
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

module.exports = router;
