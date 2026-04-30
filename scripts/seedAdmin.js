// Path: scripts/seedAdmin.js
// Run: node scripts/seedAdmin.js
// Seeds the admin user and sample teacher/student accounts

const path = require('path');

// Use NODE_PATH to resolve modules from backend directory
process.env.NODE_PATH = path.resolve(__dirname, '../backend/node_modules');
require('module').Module._initPaths();

const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const User = require('../backend/src/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jnanasetu';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create admin
    const adminEmail = 'admin@jnanasetu.com';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        email: adminEmail,
        password: 'admin123',
        name: 'System Admin',
        role: 'admin',
      });
      console.log('✅ Admin created: admin@jnanasetu.com / admin123');
    } else {
      console.log('ℹ️ Admin already exists');
    }

    // Create sample teachers
    const teachers = [
      { email: 'teacher1@jnanasetu.com', password: 'teacher123', name: 'Priya Sharma', role: 'teacher' },
      { email: 'teacher2@jnanasetu.com', password: 'teacher123', name: 'Rahul Verma', role: 'teacher' },
    ];

    for (const t of teachers) {
      let teacher = await User.findOne({ email: t.email });
      if (!teacher) {
        teacher = await User.create(t);
        console.log(`✅ Teacher created: ${t.email} / ${t.password}`);
      } else {
        console.log(`ℹ️ Teacher ${t.email} already exists`);
      }
    }

    // Create sample students
    const students = [
      { email: 'student1@jnanasetu.com', password: 'student123', name: 'Arjun Kumar', role: 'student', grade: 7 },
      { email: 'student2@jnanasetu.com', password: 'student123', name: 'Sneha Patel', role: 'student', grade: 8 },
      { email: 'student3@jnanasetu.com', password: 'student123', name: 'Vikram Singh', role: 'student', grade: 7 },
      { email: 'student4@jnanasetu.com', password: 'student123', name: 'Ananya Reddy', role: 'student', grade: 8 },
      { email: 'student5@jnanasetu.com', password: 'student123', name: 'Rohit Joshi', role: 'student', grade: 7 },
    ];

    for (const s of students) {
      let student = await User.findOne({ email: s.email });
      if (!student) {
        student = await User.create(s);
        console.log(`✅ Student created: ${s.email} / ${s.password}`);
      } else {
        console.log(`ℹ️ Student ${s.email} already exists`);
      }
    }

    console.log('\n🎉 Seed complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin:    admin@jnanasetu.com / admin123');
    console.log('Teacher:  teacher1@jnanasetu.com / teacher123');
    console.log('Teacher:  teacher2@jnanasetu.com / teacher123');
    console.log('Student:  student1@jnanasetu.com / student123');
    console.log('Student:  student2@jnanasetu.com / student123');
    console.log('Student:  student3@jnanasetu.com / student123');
    console.log('Student:  student4@jnanasetu.com / student123');
    console.log('Student:  student5@jnanasetu.com / student123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
