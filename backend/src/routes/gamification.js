const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

// All gamification routes require authentication
router.use(authenticate);

// Helper function to calculate level based on XP
// Level 1: 0-99, Level 2: 100-299, Level 3: 300-599, etc.
const calculateLevel = (xp) => {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

// POST /api/gamification/xp - Add XP to user
router.post('/xp', authorize('student'), async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid XP amount is required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update XP and calculate new level
    user.xp += amount;
    const newLevel = calculateLevel(user.xp);
    const leveledUp = newLevel > user.level;
    user.level = newLevel;

    // Update streak logic
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (!user.lastStreakDate) {
      user.streakDays = 1;
      user.lastStreakDate = now;
    } else {
      const lastStreak = new Date(user.lastStreakDate);
      const lastStreakDay = new Date(lastStreak.getFullYear(), lastStreak.getMonth(), lastStreak.getDate());
      
      const diffTime = Math.abs(today - lastStreakDay);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays === 1) {
        // Increment streak if it's the next day
        user.streakDays += 1;
        user.lastStreakDate = now;
      } else if (diffDays > 1) {
        // Reset streak if more than 1 day has passed
        user.streakDays = 1;
        user.lastStreakDate = now;
      }
      // If diffDays === 0, they already got their streak today, do nothing to streak
    }

    await user.save();

    res.json({
      success: true,
      xp: user.xp,
      level: user.level,
      streakDays: user.streakDays,
      leveledUp,
      xpAdded: amount
    });
  } catch (err) {
    console.error('Error adding XP:', err);
    res.status(500).json({ error: 'Failed to update gamification data' });
  }
});

// GET /api/gamification/status - Get current gamification status
router.get('/status', async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('xp level streakDays lastStreakDate');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Ensure level is consistent with XP
    const correctLevel = calculateLevel(user.xp || 0);
    
    res.json({
      xp: user.xp || 0,
      level: Math.max(user.level || 1, correctLevel),
      streakDays: user.streakDays || 0,
    });
  } catch (err) {
    console.error('Error fetching gamification status:', err);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

module.exports = router;
