// Path: frontend/src/components/dashboard/StatCard.jsx
import React from 'react';

export default function StatCard({ icon, label, value, subtext, color = 'bg-white border-violet-50' }) {
  return (
    <div className={`rounded-2xl border-2 p-3 ${color}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className="text-lg font-bold text-gray-800">{value}</div>
      {subtext && <div className="text-[10px] text-gray-400 truncate">{subtext}</div>}
    </div>
  );
}
