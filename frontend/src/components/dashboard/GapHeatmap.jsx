// Path: frontend/src/components/dashboard/GapHeatmap.jsx
import React from 'react';

export default function GapHeatmap({ data = [] }) {
  if (data.length === 0) {
    return (
      <div className="card text-center py-6">
        <p className="text-gray-400 text-sm">No gap data available yet</p>
      </div>
    );
  }

  const getColor = (percent) => {
    if (percent >= 70) return 'bg-red-400';
    if (percent >= 50) return 'bg-orange-400';
    if (percent >= 30) return 'bg-amber-300';
    if (percent >= 10) return 'bg-yellow-200';
    return 'bg-green-100';
  };

  return (
    <div className="card overflow-x-auto">
      <div className="min-w-[300px]">
        {/* Header */}
        <div className="grid grid-cols-4 gap-1 mb-2 text-xs font-medium text-gray-500">
          <div className="pl-2">Topic</div>
          <div className="text-center">Conceptual</div>
          <div className="text-center">Procedural</div>
          <div className="text-center">Careless</div>
        </div>

        {/* Rows */}
        {data.map((row) => (
          <div key={row.topic} className="grid grid-cols-4 gap-1 mb-1">
            <div className="pl-2 text-sm text-gray-700 truncate self-center">
              {row.topic}
            </div>
            <div className="flex justify-center">
              <div
                className={`w-8 h-8 rounded-lg ${getColor(row.conceptualPercent)} flex items-center justify-center text-xs font-bold text-white`}
                title={`${row.conceptualPercent}% conceptual`}
              >
                {row.conceptualPercent}%
              </div>
            </div>
            <div className="flex justify-center">
              <div
                className={`w-8 h-8 rounded-lg ${getColor(row.proceduralPercent)} flex items-center justify-center text-xs font-bold text-white`}
                title={`${row.proceduralPercent}% procedural`}
              >
                {row.proceduralPercent}%
              </div>
            </div>
            <div className="flex justify-center">
              <div
                className={`w-8 h-8 rounded-lg ${getColor(row.carelessPercent)} flex items-center justify-center text-xs font-bold text-white`}
                title={`${row.carelessPercent}% careless`}
              >
                {row.carelessPercent}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">Low</span>
        <div className="w-4 h-4 rounded bg-green-100" />
        <div className="w-4 h-4 rounded bg-yellow-200" />
        <div className="w-4 h-4 rounded bg-amber-300" />
        <div className="w-4 h-4 rounded bg-orange-400" />
        <div className="w-4 h-4 rounded bg-red-400" />
        <span className="text-xs text-gray-400">High</span>
      </div>
    </div>
  );
}
