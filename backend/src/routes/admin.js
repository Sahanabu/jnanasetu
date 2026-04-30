// Path: backend/src/routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Event = require('../models/Event');
const { authenticate, authorize } = require('../middleware/auth');

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

// GET /api/admin/users - List all users with filtering
router.get('/users', async (req, res) => {
  try {
    const { role, grade, isActive, search } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (grade) filter.grade = parseInt(grade);
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/users/:id - Get single user
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/admin/users - Create user (admin can create any role)
router.post('/users', async (req, res) => {
  try {
    const { email, password, name, role, grade, language } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = new User({
      email: email.toLowerCase(),
      password,
      name,
      role: role || 'student',
      grade: grade || 7,
      language: language || 'en',
    });

    await user.save();
    res.status(201).json(user);
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, role, grade, language, isActive, password } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (email) updates.email = email.toLowerCase();
    if (role) updates.role = role;
    if (grade) updates.grade = grade;
    if (language) updates.language = language;
    if (isActive !== undefined) updates.isActive = isActive;

    // If password is provided, hash it
    if (password) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// POST /api/admin/map-grade - Map all students of a grade to a teacher
router.post('/map-grade', async (req, res) => {
  try {
    const { grade, teacherId } = req.body;

    if (grade === undefined || grade === null || !teacherId) {
      return res.status(400).json({ error: 'grade and teacherId are required' });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(400).json({ error: 'Invalid teacher' });
    }

    // Find all active students of this grade that are not already mapped to this teacher
    const students = await User.find({
      role: 'student',
      grade: parseInt(grade),
      isActive: true,
      teacherId: { $ne: teacher._id },
    });

    if (students.length === 0) {
      return res.status(200).json({ message: 'No unmapped students found for this grade', mappedCount: 0 });
    }

    let mappedCount = 0;
    for (const student of students) {
      // Remove student from previous teacher if any
      if (student.teacherId) {
        await User.findByIdAndUpdate(student.teacherId, {
          $pull: { studentIds: student._id },
        });
      }

      // Update student's teacher
      student.teacherId = teacher._id;
      await student.save();

      // Add student to teacher's list if not already there
      if (!teacher.studentIds.includes(student._id)) {
        teacher.studentIds.push(student._id);
      }
      mappedCount++;
    }

    await teacher.save();

    res.json({
      message: `Successfully mapped ${mappedCount} students to ${teacher.name}`,
      mappedCount,
      grade: parseInt(grade),
      teacher: { _id: teacher._id, name: teacher.name, email: teacher.email },
    });
  } catch (error) {
    console.error('Admin map-grade error:', error);
    res.status(500).json({ error: 'Failed to map students by grade' });
  }
});

// POST /api/admin/map - Map student to teacher
router.post('/map', async (req, res) => {
  try {
    const { studentId, teacherId } = req.body;

    if (!studentId || !teacherId) {
      return res.status(400).json({ error: 'studentId and teacherId are required' });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({ error: 'Invalid student' });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(400).json({ error: 'Invalid teacher' });
    }

    // Remove student from previous teacher
    if (student.teacherId) {
      await User.findByIdAndUpdate(student.teacherId, {
        $pull: { studentIds: student._id },
      });
    }

    // Update student's teacher
    student.teacherId = teacher._id;
    await student.save();

    // Add student to teacher's list if not already there
    if (!teacher.studentIds.includes(student._id)) {
      teacher.studentIds.push(student._id);
      await teacher.save();
    }

    res.json({ message: 'Student mapped to teacher successfully', student, teacher });
  } catch (error) {
    console.error('Admin map error:', error);
    res.status(500).json({ error: 'Failed to map student to teacher' });
  }
});

// POST /api/admin/unmap - Unmap student from teacher
router.post('/unmap', async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(400).json({ error: 'Invalid student' });
    }

    const teacherId = student.teacherId;
    if (!teacherId) {
      return res.status(400).json({ error: 'Student is not mapped to any teacher' });
    }

    // Remove teacher reference from student
    student.teacherId = null;
    await student.save();

    // Remove student from teacher's list
    await User.findByIdAndUpdate(teacherId, {
      $pull: { studentIds: student._id },
    });

    res.json({ message: 'Student unmapped from teacher successfully' });
  } catch (error) {
    console.error('Admin unmap error:', error);
    res.status(500).json({ error: 'Failed to unmap student from teacher' });
  }
});

// GET /api/admin/mappings - Get all teacher-student mappings
router.get('/mappings', async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher', isActive: true })
      .populate('studentIds', 'name email grade language lastActive');

    const mappings = teachers.map((teacher) => ({
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
      },
      students: teacher.studentIds || [],
      studentCount: teacher.studentIds?.length || 0,
    }));

    // Also get unmapped students
    const unmappedStudents = await User.find({
      role: 'student',
      teacherId: null,
      isActive: true,
    });

    res.json({ mappings, unmappedStudents });
  } catch (error) {
    console.error('Admin get mappings error:', error);
    res.status(500).json({ error: 'Failed to fetch mappings' });
  }
});

// GET /api/admin/stats - Get system statistics
router.get('/stats', async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const activeToday = await User.countDocuments({
      lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    const mappedStudents = await User.countDocuments({ role: 'student', teacherId: { $ne: null } });
    const unmappedStudents = totalStudents - mappedStudents;
    const totalEvents = await Event.countDocuments();
    const eventsToday = await Event.countDocuments({
      date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    res.json({
      totalStudents,
      totalTeachers,
      totalAdmins,
      activeToday,
      mappedStudents,
      unmappedStudents,
      totalEvents,
      eventsToday,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
