/**
 * Database Seed Script for Jnanasetu
 * Generates 5 Teachers, 1 Admin, and 1000 Students with mock performance data.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Event = require('../models/Event');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jnanasetu';

async function seed() {
  try {
    console.log('🚀 Starting Database Seed...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // Clear existing data
    console.log('🧹 Clearing existing Users and Events...');
    await User.deleteMany({});
    await Event.deleteMany({});

    const teacherNames = [
      'Dr. Ananya Sharma',
      'Prof. Rajesh Kumar',
      'Ms. Kavita Reddy',
      'Mr. Amit Patwardhan',
      'Dr. Sunita Deshmukh'
    ];

    const firstNames = [
      'Aarav', 'Advait', 'Ishaan', 'Vihaan', 'Arjun', 'Sai', 'Krishna', 'Aryan', 'Vivaan', 'Reyansh',
      'Aditi', 'Ananya', 'Saanvi', 'Diya', 'Aavya', 'Pari', 'Anika', 'Aaradhya', 'Myra', 'Ira',
      'Rahul', 'Siddharth', 'Varun', 'Karan', 'Sneha', 'Pooja', 'Neha', 'Rohan', 'Tanvi', 'Meera'
    ];
    
    const lastNames = [
      'Iyer', 'Patel', 'Sharma', 'Gupta', 'Singh', 'Reddy', 'Deshmukh', 'Chauhan', 'Menon', 'Joshi',
      'Kulkarni', 'Bose', 'Chatterjee', 'Dubey', 'Nair', 'Verma', 'Yadav', 'Rao', 'Shetty', 'Pillai'
    ];

    const plainPassword = 'password123';
    const hashedForInsert = await bcrypt.hash(plainPassword, 10);

    // 1. Create Admin
    const admin = await User.create({
      name: 'Aditya Vardhan (Admin)',
      email: 'admin@jnanasetu.com',
      password: plainPassword,
      role: 'admin',
    });
    console.log('✅ Admin created.');

    // 2. Create 5 Teachers
    const teachers = [];
    for (let i = 0; i < 5; i++) {
      const teacher = await User.create({
        name: teacherNames[i],
        email: `teacher${i+1}@jnanasetu.com`,
        password: plainPassword,
        role: 'teacher',
        studentIds: [],
      });
      teachers.push(teacher);
    }
    console.log(`✅ ${teachers.length} Teachers created.`);

    // 3. Create 1000 Students
    console.log('⏳ Creating 1000 Students with real names and generating data...');
    
    const studentsPerTeacher = 200;
    const grades = [6, 7, 8, 9, 10];
    const topics = ['Fractions', 'Decimals', 'Algebra', 'Geometry', 'Integers'];
    const gapTypes = ['conceptual', 'procedural', 'careless', 'overconfidence'];

    for (let t = 0; t < teachers.length; t++) {
      const teacher = teachers[t];
      const studentBatch = [];
      const eventBatch = [];

      for (let s = 1; s <= studentsPerTeacher; s++) {
        const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const fullName = `${fName} ${lName}`;
        const studentIndex = t * studentsPerTeacher + s;
        const grade = grades[Math.floor(Math.random() * grades.length)];
        
        const student = {
          _id: new mongoose.Types.ObjectId(),
          name: fullName,
          email: `student${studentIndex}@jnanasetu.com`,
          password: hashedForInsert,
          role: 'student',
          grade: grade,
          teacherId: teacher._id,
          xp: Math.floor(Math.random() * 5000),
          level: Math.floor(Math.random() * 10) + 1,
        };

        const profile = Math.floor(Math.random() * 4);
        let accuracyRange;
        if (profile === 0) accuracyRange = [80, 100];
        else if (profile === 1) accuracyRange = [60, 80];
        else if (profile === 2) accuracyRange = [20, 50];
        else accuracyRange = [40, 70];

        const numEvents = 20 + Math.floor(Math.random() * 30);
        for (let e = 0; e < numEvents; e++) {
          const topic = topics[Math.floor(Math.random() * topics.length)];
          const correct = Math.random() * 100 < (accuracyRange[0] + Math.random() * (accuracyRange[1] - accuracyRange[0]));
          
          let gapType = null;
          if (!correct) {
            if (profile === 0) gapType = 'careless';
            else if (profile === 2) gapType = Math.random() > 0.5 ? 'conceptual' : 'procedural';
            else gapType = gapTypes[Math.floor(Math.random() * gapTypes.length)];
          }

          eventBatch.push({
            eventId: `seed-${studentIndex}-${e}`,
            studentId: student._id.toString(),
            topic: topic,
            questionId: `q-${Math.floor(Math.random() * 100)}`,
            correct: correct,
            gapType: gapType,
            confidence: correct ? (Math.floor(Math.random() * 2) + 4) : (Math.floor(Math.random() * 3) + 1),
            date: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
            synced: true
          });
        }

        studentBatch.push(student);
        teacher.studentIds.push(student._id);
      }

      await User.insertMany(studentBatch);
      await Event.insertMany(eventBatch);
      await teacher.save();
      
      console.log(`   - Processed ${teacher.name} and their 200 students.`);
    }

    console.log('\n✨ Seeding Complete!');
    console.log('Summary:');
    console.log('- 1 Admin (admin@jnanasetu.com / password123)');
    console.log('- 5 Teachers (teacher1-5@jnanasetu.com / password123)');
    console.log('- 1000 Students mapped to teachers');
    console.log('- ~40,000 Performance events generated');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
