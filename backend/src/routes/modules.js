// Path: backend/src/routes/modules.js
const express = require('express');
const router = express.Router();
const Module = require('../models/Module');
const { authenticate } = require('../middleware/auth');

// Get all modules (summary list)
router.get('/', authenticate, async (req, res) => {
  try {
    const filter = {
      $or: [
        { assignedTo: null },
        { assignedTo: req.userId }
      ]
    };

    // Admins and teachers can see all modules
    const modules = await Module.find(req.userRole === 'student' ? filter : {}, {
      moduleId: 1,
      subject: 1,
      chapter: 1,
      grade: 1,
      topic: 1,
      'questions.id': 1,
      'questions.difficulty': 1,
      version: 1,
      assignedTo: 1,
    }).sort({ createdAt: -1 });

    const summary = modules.map((m) => ({
      moduleId: m.moduleId,
      subject: m.subject,
      chapter: m.chapter,
      grade: m.grade,
      topic: m.topic,
      questionCount: m.questions?.length || 0,
      version: m.version,
      isAssigned: !!m.assignedTo,
    }));

    res.json(summary);
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

// Get a specific module by ID
router.get('/:moduleId', authenticate, async (req, res) => {
  try {
    const module = await Module.findOne({ moduleId: req.params.moduleId });
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Verify access if assigned
    if (req.userRole === 'student' && module.assignedTo && module.assignedTo.toString() !== req.userId) {
      return res.status(403).json({ error: 'You do not have access to this assigned quiz' });
    }

    res.json(module);
  } catch (error) {
    console.error('Error fetching module:', error);
    res.status(500).json({ error: 'Failed to fetch module' });
  }
});

// ... (Create/Update route kept as is or updated with auth)

// Generate a new module using AI
router.post('/generate', authenticate, async (req, res) => {
  try {
    const { subject, chapter, grade, topic, count, language = 'English', assignedTo } = req.body;
    if (!subject || !chapter || !topic || !count) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ... (AI generation logic)
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'AI API key not configured' });
    }

    const prompt = `You are an expert teacher creating a quiz for Grade ${grade} students in India.
Subject: ${subject}
Chapter: ${chapter}
Topic: ${topic}
Language: ${language}

Generate exactly ${count} multiple-choice questions in ${language}.
Return ONLY a valid JSON array of objects. Do not include markdown formatting or backticks.
Schema per object:
{
  "id": "q_unique_id",
  "question": "The question text",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "A",
  "explanation": "Why this is correct",
  "concept": "subtopic",
  "difficulty": "easy | medium | hard",
  "misconceptions": []
}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API failed: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Failed to parse AI output');
    const rawQuestions = JSON.parse(jsonMatch[0]);
    
    const questions = rawQuestions.map(q => ({
      ...q,
      difficulty: ['easy', 'medium', 'hard'].includes(String(q.difficulty).toLowerCase()) ? String(q.difficulty).toLowerCase() : 'medium'
    }));

    // Save as a new module
    const moduleId = `${subject.toLowerCase()}_${grade}_${topic.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const module = new Module({
      moduleId,
      subject,
      chapter,
      grade,
      topic,
      questions,
      assignedTo: assignedTo || null,
      version: 1
    });

    await module.save();
    res.json(module);

  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

module.exports = router;
