// Path: backend/src/routes/events.js
const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

// Batch upsert events
router.post('/batch', async (req, res) => {
  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Events array is required', synced: 0 });
    }

    let synced = 0;

    for (const event of events) {
      try {
        await Event.findOneAndUpdate(
          { eventId: event.eventId },
          {
            ...event,
            date: event.date ? new Date(event.date) : new Date(),
            synced: true,
          },
          { upsert: true, new: true, runValidators: true }
        );
        synced++;
      } catch (err) {
        console.error('Failed to upsert event:', event.eventId, err.message);
      }
    }

    res.json({ synced });
  } catch (error) {
    console.error('Error in batch sync:', error);
    res.status(500).json({ error: 'Failed to sync events', synced: 0 });
  }
});

// Get class gaps data for dashboard
router.get('/class/:classId/gaps', async (req, res) => {
  try {
    const { classId } = req.params;

    // Aggregate events by topic and gap type
    const gapAggregation = await Event.aggregate([
      {
        $group: {
          _id: { topic: '$topic', gapType: '$gapType' },
          count: { $sum: 1 },
          students: { $addToSet: '$studentId' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Build heatmap data
    const topicMap = {};
    let topMisconception = null;
    let maxCount = 0;

    for (const item of gapAggregation) {
      const topic = item._id.topic || 'unknown';
      const gapType = item._id.gapType || 'unknown';

      if (!topicMap[topic]) {
        topicMap[topic] = { conceptual: 0, procedural: 0, careless: 0, unknown: 0 };
      }
      if (topicMap[topic][gapType] !== undefined) {
        topicMap[topic][gapType] = item.count;
      }

      if (item.count > maxCount && gapType !== 'unknown') {
        maxCount = item.count;
        topMisconception = { topic, gapType, count: item.count };
      }
    }

    const heatmapData = Object.entries(topicMap).map(([topic, gaps]) => {
      const total = gaps.conceptual + gaps.procedural + gaps.careless + gaps.unknown;
      return {
        topic,
        conceptualPercent: total > 0 ? Math.round((gaps.conceptual / total) * 100) : 0,
        proceduralPercent: total > 0 ? Math.round((gaps.procedural / total) * 100) : 0,
        carelessPercent: total > 0 ? Math.round((gaps.careless / total) * 100) : 0,
      };
    });

    // Get overconfidence alerts
    const overconfidenceAlerts = await Event.find({
      gapType: 'overconfidence',
      date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }).sort({ date: -1 }).limit(20);

    // Get students with recent events
    const recentEvents = await Event.aggregate([
      { $sort: { date: -1 } },
      {
        $group: {
          _id: '$studentId',
          recentEvents: { $push: { eventId: '$eventId', topic: '$topic', gapType: '$gapType', date: '$date', correct: '$correct' } },
          count: { $sum: 1 },
        },
      },
      { $limit: 50 },
    ]);

    const students = recentEvents.map((s) => ({
      studentId: s._id,
      name: s._id.replace('student_', 'Student '),
      recentEvents: s.recentEvents.slice(0, 10),
      eventCount: s.count,
    }));

    // Calculate mastery rate
    const totalEvents = await Event.countDocuments();
    const qualityEvents = await Event.countDocuments({
      correct: true,
      confidence: { $gte: 4 },
    });

    res.json({
      students,
      heatmapData,
      topMisconception,
      overconfidenceAlerts,
      masteryRate: totalEvents > 0 ? Math.round((qualityEvents / totalEvents) * 100) : 0,
    });
  } catch (error) {
    console.error('Error fetching class gaps:', error);
    res.status(500).json({ error: 'Failed to fetch class gaps' });
  }
});

// Get events for a specific student
router.get('/student/:studentId', async (req, res) => {
  try {
    const events = await Event.find({ studentId: req.params.studentId })
      .sort({ date: -1 })
      .limit(50);
    res.json(events);
  } catch (error) {
    console.error('Error fetching student events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

module.exports = router;
