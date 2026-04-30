// Path: backend/src/routes/insights.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Event = require('../models/Event');
const { authenticate, authorize } = require('../middleware/auth');

// All insight routes require authentication + teacher role
router.use(authenticate, authorize('teacher', 'admin'));

// GET /api/insights/students - Get AI-powered insights for all students of this teacher
router.get('/students', async (req, res) => {
  try {
    const teacher = await User.findById(req.userId).populate('studentIds');
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    let targetStudents = teacher.studentIds;
    
    // Fallback for hackathon demo: If teacher has no students, show all students in the grade
    if (targetStudents.length === 0) {
      targetStudents = await User.find({ role: 'student' });
      // Optional: filter by grade if teacher has a grade
      // .find({ role: 'student', grade: teacher.grade });
    }

    // Optimization: Fetch all events for all target students in one query
    const studentIds = targetStudents.map(s => s._id.toString());
    const allEvents = await Event.find({ studentId: { $in: studentIds } }).sort({ date: -1 });

    // Group events by student for faster processing
    const eventsByStudent = {};
    allEvents.forEach(e => {
      const sId = e.studentId.toString();
      if (!eventsByStudent[sId]) eventsByStudent[sId] = [];
      eventsByStudent[sId].push(e);
    });

    const insights = [];

    for (const student of targetStudents) {
      const studentIdStr = student._id.toString();
      const events = eventsByStudent[studentIdStr] || [];
      
      if (events.length === 0) {
        insights.push({
          student: { _id: student._id, name: student.name, email: student.email, grade: student.grade },
          status: 'insufficient_data',
          message: 'Not enough learning data yet',
          metrics: null,
          lastActive: student.lastActive,
        });
        continue;
      }

      // Calculate metrics
      const totalAttempts = events.length;
      const correctAttempts = events.filter((e) => e.correct).length;
      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

      // Gap analysis
      const gapCounts = { conceptual: 0, procedural: 0, careless: 0, overconfidence: 0 };
      events.forEach((e) => {
        if (e.gapType && gapCounts[e.gapType] !== undefined) {
          gapCounts[e.gapType]++;
        }
      });

      // Topic-wise performance
      const topicPerformance = {};
      events.forEach((e) => {
        if (!e.topic) return;
        if (!topicPerformance[e.topic]) {
          topicPerformance[e.topic] = { attempts: 0, correct: 0 };
        }
        topicPerformance[e.topic].attempts++;
        if (e.correct) topicPerformance[e.topic].correct++;
      });

      // Strong and weak topics
      const topicScores = Object.entries(topicPerformance).map(([topic, data]) => ({
        topic,
        accuracy: Math.round((data.correct / data.attempts) * 100),
        attempts: data.attempts,
      }));

      const strongTopics = topicScores.filter((t) => t.accuracy >= 70).sort((a, b) => b.accuracy - a.accuracy);
      const weakTopics = topicScores.filter((t) => t.accuracy < 50).sort((a, b) => a.accuracy - b.accuracy);

      // Confidence analysis (overconfidence detection)
      const overconfidentEvents = events.filter(
        (e) => e.confidence >= 4 && !e.correct
      );
      const overconfidenceRate = totalAttempts > 0
        ? Math.round((overconfidentEvents.length / totalAttempts) * 100)
        : 0;

      // Recent trend (last 20 events)
      const recentEvents = events.slice(0, 20);
      const recentCorrect = recentEvents.filter((e) => e.correct).length;
      const recentAccuracy = recentEvents.length > 0
        ? Math.round((recentCorrect / recentEvents.length) * 100)
        : 0;

      // Determine student strength level
      let strengthLevel;
      let recommendation;
      if (accuracy >= 80 && overconfidenceRate < 10) {
        strengthLevel = 'strong';
        recommendation = 'Student is performing well. Challenge with advanced topics and encourage peer mentoring.';
      } else if (accuracy >= 60 && overconfidenceRate < 20) {
        strengthLevel = 'average';
        recommendation = 'Student is on track. Focus on weak topics and reinforce conceptual understanding.';
      } else if (accuracy < 40 || overconfidenceRate >= 30) {
        strengthLevel = 'needs_attention';
        recommendation = 'Student needs intervention. Focus on foundational concepts and address overconfidence.';
      } else {
        strengthLevel = 'developing';
        recommendation = 'Student is developing. Provide additional practice and targeted feedback.';
      }

      // AI-generated insight
      const dominantGap = Object.entries(gapCounts).sort((a, b) => b[1] - a[1])[0];
      const aiInsight = generateAIInsight(strengthLevel, accuracy, dominantGap, overconfidenceRate, weakTopics, strongTopics);

      insights.push({
        student: { _id: student._id, name: student.name, email: student.email, grade: student.grade },
        status: 'analyzed',
        metrics: {
          totalAttempts,
          accuracy,
          correctCount: correctAttempts,
          gapCounts,
          dominantGap: dominantGap[1] > 0 ? { type: dominantGap[0], count: dominantGap[1] } : null,
          strongTopics: strongTopics.slice(0, 3),
          weakTopics: weakTopics.slice(0, 3),
          overconfidenceRate,
          recentAccuracy,
          strengthLevel,
          topicMastery: topicScores,
        },
        recommendation,
        aiInsight,
        lastActive: student.lastActive,
      });
    }

    // Sort: needs_attention first, then developing, then average, then strong
    const priorityOrder = { needs_attention: 0, developing: 1, average: 2, strong: 3, insufficient_data: 4 };
    insights.sort((a, b) => {
      const aOrder = priorityOrder[a.metrics?.strengthLevel || 'insufficient_data'];
      const bOrder = priorityOrder[b.metrics?.strengthLevel || 'insufficient_data'];
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      // Secondary: Accuracy (Lower first)
      const aAcc = a.metrics?.accuracy || 0;
      const bAcc = b.metrics?.accuracy || 0;
      return aAcc - bAcc;
    });

    res.json({
      teacher: { _id: teacher._id, name: teacher.name },
      totalStudents: teacher.studentIds.length,
      insights,
    });
  } catch (error) {
    console.error('Error in student insights:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/insights/peer-mentors/:topic
router.get('/peer-mentors/:topic', authenticate, async (req, res) => {
  try {
    const { topic } = req.params;
    const { grade } = req.query;

    // Find students in the same grade who have high accuracy in this topic
    // For this hackathon demo, we look for students who have >70% accuracy in the last 10 attempts
    const filter = { topic };
    if (grade) {
      const peers = await User.find({ grade: parseInt(grade), role: 'student' }).select('_id name');
      filter.studentId = { $in: peers.map(p => p._id.toString()) };
    }

    const events = await Event.find(filter).sort({ date: -1 });
    
    const studentStats = {};
    events.forEach(e => {
      if (!studentStats[e.studentId]) studentStats[e.studentId] = { correct: 0, total: 0 };
      if (studentStats[e.studentId].total < 10) {
        studentStats[e.studentId].total++;
        if (e.correct) studentStats[e.studentId].correct++;
      }
    });

    const mentorIds = Object.keys(studentStats).filter(id => {
      const stats = studentStats[id];
      return id !== req.userId && stats.total >= 3 && (stats.correct / stats.total) >= 0.7;
    });

    if (mentorIds.length === 0) {
      return res.json({ mentors: [] });
    }

    const mentors = await User.find({ _id: { $in: mentorIds } }).select('name').limit(3);
    res.json({ mentors });

  } catch (error) {
    console.error('Error finding peer mentors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/insights/students/:studentId/per-question - Get per-question insights for a student
router.get('/students/:studentId/per-question', async (req, res) => {
  try {
    const teacher = await User.findById(req.userId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const student = await User.findById(req.params.studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Verify the student belongs to this teacher
    if (req.userRole !== 'admin' && teacher.studentIds.length > 0 && !teacher.studentIds.includes(student._id)) {
      return res.status(403).json({ error: 'This student is not assigned to you' });
    }

    const events = await Event.find({ studentId: student.studentId || student._id.toString() })
      .sort({ date: -1 })
      .limit(100);

    // Group events by question for per-question analysis
    const questionMap = {};
    events.forEach((e) => {
      const qId = e.questionId || `unknown-${e._id}`;
      if (!questionMap[qId]) {
        questionMap[qId] = {
          questionId: qId,
          topic: e.topic || 'unknown',
          subtopic: e.subtopic || '',
          attempts: [],
          firstAttempt: e.date,
          lastAttempt: e.date,
        };
      }
      questionMap[qId].attempts.push({
        date: e.date,
        correct: e.correct,
        gapType: e.gapType,
        confidence: e.confidence,
        studentAnswer: e.studentAnswer,
        correctAnswer: e.correctAnswer,
      });
      if (e.date < questionMap[qId].firstAttempt) questionMap[qId].firstAttempt = e.date;
      if (e.date > questionMap[qId].lastAttempt) questionMap[qId].lastAttempt = e.date;
    });

    // Analyze each question
    const perQuestionInsights = Object.entries(questionMap).map(([qId, data]) => {
      const totalAttempts = data.attempts.length;
      const correctAttempts = data.attempts.filter(a => a.correct).length;
      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

      // Gap distribution for this question
      const gapCounts = { conceptual: 0, procedural: 0, careless: 0, unknown: 0 };
      data.attempts.forEach(a => {
        if (a.gapType && gapCounts[a.gapType] !== undefined) {
          gapCounts[a.gapType]++;
        }
      });

      // Trend (first vs last attempt)
      const sortedAttempts = [...data.attempts].sort((a, b) => new Date(a.date) - new Date(b.date));
      const firstCorrect = sortedAttempts[0]?.correct || false;
      const lastCorrect = sortedAttempts[sortedAttempts.length - 1]?.correct || false;
      const improvement = !firstCorrect && lastCorrect ? 'improved' :
                          firstCorrect && !lastCorrect ? 'regressed' :
                          firstCorrect && lastCorrect ? 'maintained' : 'needs_work';

      return {
        questionId: qId,
        topic: data.topic,
        subtopic: data.subtopic,
        totalAttempts,
        accuracy,
        correctCount: correctAttempts,
        gapCounts,
        dominantGap: Object.entries(gapCounts).sort((a, b) => b[1] - a[1]).find(([_, c]) => c > 0)?.[0] || null,
        trend: improvement,
        firstAttempt: data.firstAttempt,
        lastAttempt: data.lastAttempt,
        recentAnswer: sortedAttempts[sortedAttempts.length - 1] || null,
      };
    });

    res.json({
      student: { _id: student._id, name: student.name },
      totalQuestions: perQuestionInsights.length,
      perQuestionInsights: perQuestionInsights.sort((a, b) => a.accuracy - b.accuracy),
    });
  } catch (error) {
    console.error('Per-question insights error:', error);
    res.status(500).json({ error: 'Failed to fetch per-question insights' });
  }
});

// GET /api/insights/students/:studentId - Get insights for a specific student
router.get('/students/:studentId', async (req, res) => {

  try {
    const teacher = await User.findById(req.userId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const student = await User.findById(req.params.studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Verify the student belongs to this teacher
    if (req.userRole !== 'admin' && !teacher.studentIds.includes(student._id)) {
      return res.status(403).json({ error: 'This student is not assigned to you' });
    }

    const events = await Event.find({ studentId: student.studentId || student._id.toString() })
      .sort({ date: -1 })
      .limit(200);

    // Detailed analysis
    const totalAttempts = events.length;
    const correctAttempts = events.filter((e) => e.correct).length;
    const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

    // Daily activity
    const dailyActivity = {};
    events.forEach((e) => {
      const day = new Date(e.date).toISOString().split('T')[0];
      if (!dailyActivity[day]) dailyActivity[day] = { attempts: 0, correct: 0 };
      dailyActivity[day].attempts++;
      if (e.correct) dailyActivity[day].correct++;
    });

    // Topic mastery over time
    const topicMastery = {};
    events.forEach((e) => {
      if (!e.topic) return;
      if (!topicMastery[e.topic]) {
        topicMastery[e.topic] = { attempts: 0, correct: 0, recentCorrect: 0, recentAttempts: 0 };
      }
      topicMastery[e.topic].attempts++;
      if (e.correct) topicMastery[e.topic].correct++;
    });

    // Calculate recent performance per topic (last 10 events per topic)
    const topicEvents = {};
    events.forEach((e) => {
      if (!e.topic) return;
      if (!topicEvents[e.topic]) topicEvents[e.topic] = [];
      topicEvents[e.topic].push(e);
    });

    Object.entries(topicEvents).forEach(([topic, topicEvts]) => {
      const recent = topicEvts.slice(0, 10);
      topicMastery[topic].recentAttempts = recent.length;
      topicMastery[topic].recentCorrect = recent.filter((e) => e.correct).length;
    });

    res.json({
      student: { _id: student._id, name: student.name, email: student.email, grade: student.grade, language: student.language },
      metrics: {
        totalAttempts,
        accuracy,
        correctCount: correctAttempts,
        dailyActivity: Object.entries(dailyActivity).map(([date, data]) => ({ date, ...data })),
        topicMastery: Object.entries(topicMastery).map(([topic, data]) => ({
          topic,
          ...data,
          accuracy: Math.round((data.correct / data.attempts) * 100),
          recentAccuracy: data.recentAttempts > 0 ? Math.round((data.recentCorrect / data.recentAttempts) * 100) : 0,
        })),
      },
      recentEvents: events.slice(0, 20),
    });
  } catch (error) {
    console.error('Student insights error:', error);
    res.status(500).json({ error: 'Failed to fetch student insights' });
  }
});

// Helper function to generate AI insight text
function generateAIInsight(strengthLevel, accuracy, dominantGap, overconfidenceRate, weakTopics, strongTopics) {
  const parts = [];

  // Overall assessment
  if (strengthLevel === 'strong') {
    parts.push('🌟 This student demonstrates strong mastery with consistent performance.');
  } else if (strengthLevel === 'needs_attention') {
    parts.push('⚠️ This student requires immediate attention and targeted intervention.');
  } else if (strengthLevel === 'developing') {
    parts.push('📈 This student is showing progress but needs continued support.');
  } else {
    parts.push('✅ This student is on a steady learning path with room for growth.');
  }

  // Gap insight
  if (dominantGap && dominantGap[1] > 0) {
    const gapLabels = {
      conceptual: 'conceptual understanding gaps',
      procedural: 'procedural errors in problem-solving',
      careless: 'careless mistakes that could be reduced with focus',
      overconfidence: 'overconfidence leading to errors',
    };
    parts.push(`Primary challenge: ${gapLabels[dominantGap[0]] || 'various learning gaps'} (${dominantGap[1]} instances).`);
  }

  // Overconfidence alert
  if (overconfidenceRate >= 20) {
    parts.push(`🚨 Overconfidence alert: ${overconfidenceRate}% of answers show high confidence but incorrect results.`);
  }

  // Weak topics
  if (weakTopics.length > 0) {
    const weakNames = weakTopics.map((t) => t.topic).join(', ');
    parts.push(`Needs improvement in: ${weakNames}.`);
  }

  // Strong topics
  if (strongTopics.length > 0) {
    const strongNames = strongTopics.map((t) => t.topic).join(', ');
    parts.push(`Strong areas: ${strongNames}.`);
  }

  return parts.join(' ');
}

module.exports = router;
