import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import AutoTranslate from '../common/AutoTranslate.jsx';

export default function GamificationBanner() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState({ xp: 0, level: 1, streakDays: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/gamification/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch gamification stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Listen for manual XP updates from other components
    window.addEventListener('jnanasetu_xp_updated', fetchStats);
    return () => window.removeEventListener('jnanasetu_xp_updated', fetchStats);
  }, [token]);

  if (loading) return null;

  // Calculate progress to next level
  const currentLevelBaseXP = Math.pow(stats.level - 1, 2) * 100;
  let nextLevelBaseXP = Math.pow(stats.level, 2) * 100;
  
  // Handle case where user XP is already beyond nextLevelBaseXP but level hasn't caught up
  if (stats.xp >= nextLevelBaseXP) {
    nextLevelBaseXP = Math.pow(Math.floor(Math.sqrt(stats.xp / 100)) + 1, 2) * 100;
  }

  const xpInCurrentLevel = stats.xp - currentLevelBaseXP;
  const xpNeededForTotal = nextLevelBaseXP - currentLevelBaseXP;
  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForTotal) * 100));

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 border-2 border-white shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8 mb-12"
    >
      {/* Level & Badge */}
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="6" />
            <motion.circle 
              cx="50" cy="50" r="45" 
              fill="none" 
              stroke="url(#levelGradient)" 
              strokeWidth="8" 
              strokeLinecap="round"
              initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - progressPercent / 100) }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeDasharray={`${2 * Math.PI * 45}`}
            />
            <defs>
              <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#d946ef" />
              </linearGradient>
            </defs>
          </svg>
          <motion.div 
            whileHover={{ scale: 1.2, rotate: 15 }}
            className="bg-gradient-to-br from-violet-100 to-fuchsia-100 w-14 h-14 rounded-2xl flex items-center justify-center relative z-10 shadow-inner border-2 border-white"
          >
            <span className="text-3xl">⭐</span>
          </motion.div>
          {/* Animated Glow */}
          <div className="absolute inset-0 bg-violet-400 rounded-full blur-2xl opacity-10 animate-pulse" />
        </div>
        <div>
          <AutoTranslate as="h3" className="text-xs text-gray-400 font-black uppercase tracking-[0.2em] mb-1">Status</AutoTranslate>
          <p className="text-3xl font-black text-gray-800 tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600">Level {stats.level}</span>
          </p>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="flex-1 w-full max-w-2xl">
        <div className="flex justify-between items-end mb-3">
          <div>
            <span className="text-2xl font-black text-violet-600">{stats.xp}</span>
            <span className="text-xs font-bold text-gray-400 ml-2">TOTAL XP</span>
          </div>
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs font-black text-fuchsia-500 bg-fuchsia-50 px-3 py-1 rounded-full border border-fuchsia-100"
          >
            {Math.max(0, nextLevelBaseXP - stats.xp)} XP NEEDED FOR NEXT LEVEL
          </motion.span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-5 p-1 border-2 border-white shadow-inner overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 bg-[length:200%_100%] h-full rounded-full relative overflow-hidden"
          >
            <motion.div 
              animate={{ x: ["0%", "100%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent" 
            />
          </motion.div>
        </div>
      </div>

      {/* Streak */}
      <motion.div 
        whileHover={{ scale: 1.05, y: -5 }}
        className="flex items-center gap-5 bg-gradient-to-br from-orange-50 to-amber-50 px-6 py-4 rounded-[2rem] border-2 border-white shadow-xl"
      >
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-4xl"
        >
          🔥
        </motion.div>
        <div>
          <AutoTranslate as="h3" className="text-[10px] text-orange-600 font-black uppercase tracking-widest mb-1">Streak</AutoTranslate>
          <p className="text-2xl font-black text-orange-700 leading-none">
            {stats.streakDays} <span className="text-sm font-bold opacity-70">DAYS</span>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
