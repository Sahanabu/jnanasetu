// Path: scripts/seedDemo.cjs
/**
 * Seed demo data for JnanaSetu.
 * Creates student "Arjun" and preloads the Fractions module.
 * Run: node scripts/seedDemo.cjs
 *
 * Requires the backend server to be running on http://localhost:3001.
 * Uses the backend REST API to seed data.
 */

const http = require('http');

const API_BASE = 'http://localhost:3001/api';

function apiPost(endpoint, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE);
    const body = JSON.stringify(data);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseBody));
        } catch {
          resolve(responseBody);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

const fractionsModule = {
  moduleId: 'math_7_fractions',
  subject: 'Mathematics',
  chapter: 'Fractions',
  grade: 7,
  topic: 'fractions',
  version: 1,
  questions: [
    {
      id: 'frac-001',
      question: 'What is 1/2 + 1/3?',
      correctAnswer: '5/6',
      explanation: 'To add unlike fractions, find the LCM of denominators (6), convert: 1/2=3/6, 1/3=2/6, then add: 3/6+2/6=5/6',
      concept: 'Adding unlike fractions',
      difficulty: 'medium',
      misconceptions: [
        {
          gapType: 'conceptual',
          reason: 'Student adds both numerators and denominators (1+1=2, 2+3=5 → 2/5)',
          story: [
            'Ravi and Sita each have a roti. Ravi cuts his into 2 pieces, Sita cuts hers into 3 pieces.',
            'Ravi gives you 1 piece (1/2), Sita gives you 1 piece (1/3). Are these pieces the same size? No!',
            'To combine them fairly, cut both rotis into 6 equal pieces. Now Ravi gives 3/6, Sita gives 2/6. Together you have 5/6!',
          ],
        },
        {
          gapType: 'procedural',
          reason: 'Student finds LCM correctly but forgets to convert numerator',
          story: [
            'You know you need a common denominator. The LCM of 2 and 3 is 6.',
            'But you wrote 1/2 = 1/6 and 1/3 = 1/6, forgetting to multiply the numerators too.',
            'Remember: whatever you do to the denominator, you must also do to the numerator! 1/2 = 3/6, not 1/6.',
          ],
        },
        {
          gapType: 'careless',
          reason: 'Student knows the method but makes an arithmetic slip',
          story: [
            'You correctly found the LCM of 2 and 3 is 6.',
            'You converted 1/2 = 3/6 and 1/3 = 2/6 correctly.',
            'But when adding 3/6 + 2/6, you wrote 4/6 instead of 5/6. Double-check your addition!',
          ],
        },
      ],
    },
    {
      id: 'frac-002',
      question: 'What is 2/3 × 3/4?',
      correctAnswer: '1/2',
      explanation: 'Multiply numerators: 2×3=6, denominators: 3×4=12, simplify: 6/12=1/2',
      concept: 'Multiplying fractions',
      difficulty: 'medium',
      misconceptions: [
        {
          gapType: 'conceptual',
          reason: 'Student thinks multiplication means "bigger number" and adds instead',
          story: [
            'When you multiply fractions, you are finding a "part of a part." 2/3 of 3/4 means taking 2 out of every 3 parts from 3/4 of a whole.',
            'Imagine a chocolate bar divided into 4 rows. You take 3 rows (3/4). Now from those 3 rows, you take 2/3 of them.',
            'That gives you 2 rows out of the original 4, which is 1/2. Multiply across: 2×3=6, 3×4=12, simplify to 1/2!',
          ],
        },
        {
          gapType: 'procedural',
          reason: 'Student multiplies but forgets to simplify',
          story: [
            'You correctly multiplied: 2×3=6 and 3×4=12, giving 6/12.',
            'But 6/12 can be simplified! Both 6 and 12 are divisible by 6.',
            'Divide numerator and denominator by 6: 6÷6=1, 12÷6=2. The answer is 1/2.',
          ],
        },
        {
          gapType: 'careless',
          reason: 'Student multiplies denominators correctly but slips on numerators',
          story: [
            'You set up the multiplication correctly: 2/3 × 3/4.',
            'You multiplied denominators: 3×4=12. Correct!',
            'But you wrote 2×3=5 instead of 6. Check your times tables carefully.',
          ],
        },
      ],
    },
    {
      id: 'frac-003',
      question: 'Which is larger: 3/5 or 2/3?',
      correctAnswer: '2/3',
      explanation: 'Cross-multiply: 3×3=9, 2×5=10. Since 10>9, 2/3 > 3/5',
      concept: 'Comparing fractions',
      difficulty: 'easy',
      misconceptions: [
        {
          gapType: 'conceptual',
          reason: 'Student compares numerators or denominators directly without common base',
          story: [
            'You see 3/5 and 2/3 and think "3 is bigger than 2, so 3/5 is bigger." But the wholes are cut differently!',
            'Imagine 3/5 means a roti cut into 5 pieces and you take 3. 2/3 means a roti cut into 3 pieces and you take 2.',
            'To compare fairly, cut both rotis into 15 equal pieces. 3/5 = 9/15 and 2/3 = 10/15. Now 10 > 9, so 2/3 is larger!',
          ],
        },
        {
          gapType: 'procedural',
          reason: 'Student tries cross-multiplication but applies it incorrectly',
          story: [
            'You know to cross-multiply: 3/5 vs 2/3.',
            'You multiplied 3×3=9 and 5×2=10, but then said 9>10 by mistake.',
            'Double-check: 3×3=9 (for 3/5) and 5×2=10 (for 2/3). Since 10>9, 2/3 is larger.',
          ],
        },
        {
          gapType: 'careless',
          reason: 'Student knows the method but makes a calculation error',
          story: [
            'You correctly set up the comparison: 3/5 vs 2/3.',
            'You cross-multiplied: 3×3=9 and 5×2=10.',
            'But you wrote 5×2=12 instead of 10. Be careful with your multiplication!',
          ],
        },
      ],
    },
    {
      id: 'frac-004',
      question: 'What is 3/4 of 20?',
      correctAnswer: '15',
      explanation: '3/4 × 20 = (3×20)/4 = 60/4 = 15',
      concept: 'Fraction of a quantity',
      difficulty: 'easy',
      misconceptions: [
        {
          gapType: 'conceptual',
          reason: 'Student subtracts instead of multiplying (20 - 3/4)',
          story: [
            '"Of" in mathematics means multiply, not subtract. 3/4 of 20 means 3/4 × 20.',
            'Think of it as: divide 20 into 4 equal groups (5 each), then take 3 of those groups.',
            '3 groups of 5 = 15. So 3/4 of 20 = 15.',
          ],
        },
        {
          gapType: 'procedural',
          reason: 'Student divides by numerator instead of denominator first',
          story: [
            'You know to multiply: 3/4 × 20.',
            'But you divided 20 by 3 first (≈6.67) instead of dividing by 4 first.',
            'Always divide by the denominator first: 20÷4=5, then multiply by numerator: 5×3=15.',
          ],
        },
        {
          gapType: 'careless',
          reason: 'Student does correct method but arithmetic slip',
          story: [
            'You correctly set up: 3/4 × 20 = (3×20)/4.',
            '3×20=60, then 60÷4...',
            'You wrote 60÷4=20 instead of 15. 4×15=60, not 4×20!',
          ],
        },
      ],
    },
    {
      id: 'frac-005',
      question: 'Convert 7/3 to a mixed number.',
      correctAnswer: '2 1/3',
      explanation: '7÷3=2 remainder 1, so 7/3 = 2 1/3',
      concept: 'Mixed numbers',
      difficulty: 'easy',
      misconceptions: [
        {
          gapType: 'conceptual',
          reason: 'Student thinks numerator is always smaller than denominator',
          story: [
            'A fraction like 7/3 means you have 7 pieces, each piece is 1/3 of a whole.',
            'Since 3 pieces make 1 whole, 7 pieces make 2 wholes (6 pieces) with 1 piece left over.',
            'So 7/3 = 2 wholes + 1/3 = 2 1/3. The numerator CAN be bigger than the denominator!',
          ],
        },
        {
          gapType: 'procedural',
          reason: 'Student divides but writes remainder incorrectly',
          story: [
            'You divided 7÷3=2 remainder 1. Correct so far!',
            'But you wrote the mixed number as 2 1/7 instead of 2 1/3.',
            'The remainder (1) keeps the original denominator (3). So it is 2 1/3, not 2 1/7.',
          ],
        },
        {
          gapType: 'careless',
          reason: 'Student does correct division but makes a writing error',
          story: [
            'You correctly divided 7 by 3: 7÷3=2 remainder 1.',
            'You wrote 2 1/3 but then changed it to 2 2/3.',
            'Trust your division! 7÷3=2 with 1 left over = 2 1/3.',
          ],
        },
      ],
    },
  ],
};

const arjunStudent = {
  studentId: 'student_arjun',
  name: 'Arjun',
  grade: 7,
  language: 'kn',
};

const demoEvents = [
  {
    eventId: 'demo_evt_001',
    studentId: 'student_arjun',
    sessionId: 'demo_session_1',
    date: new Date().toISOString(),
    topic: 'fractions',
    subtopic: 'Adding unlike fractions',
    questionId: 'frac-001',
    studentAnswer: '2/5',
    correctAnswer: '5/6',
    gapType: 'conceptual',
    confidence: 5,
    correct: false,
    selfFixed: false,
    modality: 'text',
    synced: true,
  },
  {
    eventId: 'demo_evt_002',
    studentId: 'student_arjun',
    sessionId: 'demo_session_1',
    date: new Date().toISOString(),
    topic: 'fractions',
    subtopic: 'Adding unlike fractions',
    questionId: 'frac-001',
    studentAnswer: '5/6',
    correctAnswer: '5/6',
    gapType: null,
    confidence: 4,
    correct: true,
    selfFixed: true,
    modality: 'visual',
    synced: true,
  },
];

async function seed() {
  console.log('🌱 Seeding JnanaSetu demo data...\n');

  try {
    // Seed student
    console.log('📡 Creating student...');
    await apiPost('/students', arjunStudent);
    console.log('✅ Created student: Arjun (Grade 7, Kannada)');

    // Seed module
    console.log('📡 Loading module...');
    await apiPost('/modules', fractionsModule);
    console.log('✅ Loaded Fractions module with 5 questions');

    // Seed demo events
    console.log('📡 Creating events...');
    await apiPost('/events/batch', { events: demoEvents });
    console.log('✅ Created demo events (overconfidence + self-fix)');

    console.log('\n🎉 Demo data seeded successfully!');
    console.log('\n📋 To run the demo:');
    console.log('   1. cd backend && npm run dev');
    console.log('   2. cd frontend && npm run dev');
    console.log('   3. Open http://localhost:5173');
    console.log('   4. The app will auto-detect Arjun');
    console.log('   5. Open /learn to start the Fractions module');
    console.log('   6. Open /dashboard to see teacher view\n');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error('\n💡 Make sure the backend server is running: cd backend && npm run dev');
    process.exit(1);
  }
}

seed();
