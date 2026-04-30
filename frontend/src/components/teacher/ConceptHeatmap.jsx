// Path: frontend/src/components/teacher/ConceptHeatmap.jsx
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function ConceptHeatmap({ insights, onStudentClick }) {
  const heatmapData = useMemo(() => {
    if (!insights || !insights.insights) return [];

    const concepts = {};

    insights.insights.forEach((item) => {
      const student = item.student;
      const topicMastery = item.metrics?.topicMastery || [];

      topicMastery.forEach((tm) => {
        const topic = tm.topic;
        if (!concepts[topic]) {
          concepts[topic] = {
            name: topic,
            totalAccuracy: 0,
            studentCount: 0,
            strugglingStudents: [], // < 50% accuracy
            averageAccuracy: 0
          };
        }

        concepts[topic].totalAccuracy += tm.accuracy;
        concepts[topic].studentCount += 1;
        
        if (tm.accuracy < 50) {
          concepts[topic].strugglingStudents.push({
            ...student,
            accuracy: tm.accuracy
          });
        }
      });
    });

    // Final calculation and sorting
    return Object.values(concepts)
      .map(c => ({
        ...c,
        averageAccuracy: Math.round(c.totalAccuracy / c.studentCount)
      }))
      .sort((a, b) => a.averageAccuracy - b.averageAccuracy); // Show lowest accuracy first
  }, [insights]);

  if (heatmapData.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Concept Heatmap</h2>
          <p className="text-sm text-gray-500 font-medium">Class-wide performance across topics</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" /> Critical
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-500" /> Developing
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" /> Mastery
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {heatmapData.map((concept) => (
          <motion.div 
            key={concept.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-[2rem] p-6 border-2 transition-all hover:shadow-xl ${
              concept.averageAccuracy < 50 
              ? 'bg-red-50 border-red-100' 
              : concept.averageAccuracy < 75 
              ? 'bg-amber-50 border-amber-100' 
              : 'bg-emerald-50 border-emerald-100'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm bg-white`}>
                  {concept.averageAccuracy < 50 ? '🆘' : concept.averageAccuracy < 75 ? '📈' : '🌟'}
                </div>
                <div>
                  <h3 className="font-black text-gray-900 leading-tight">{concept.name}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {concept.studentCount} Students
                  </p>
                </div>
              </div>
              <div className={`text-2xl font-black ${
                concept.averageAccuracy < 50 ? 'text-red-600' : concept.averageAccuracy < 75 ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {concept.averageAccuracy}%
              </div>
            </div>

            <div className="w-full bg-gray-200/50 rounded-full h-2 mb-6">
              <div 
                className={`h-2 rounded-full transition-all duration-1000 ${
                  concept.averageAccuracy < 50 ? 'bg-red-500' : concept.averageAccuracy < 75 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${concept.averageAccuracy}%` }}
              />
            </div>

            {concept.strugglingStudents.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-3">
                  Needs Urgent Attention ({concept.strugglingStudents.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {concept.strugglingStudents.slice(0, 5).map((student) => (
                    <button
                      key={student._id}
                      onClick={() => onStudentClick(student)}
                      className="group flex items-center gap-2 bg-white/80 hover:bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm transition-all"
                    >
                      <span className="text-[10px] font-bold text-gray-700">{student.name}</span>
                      <span className="text-[10px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md">
                        {student.accuracy}%
                      </span>
                    </button>
                  ))}
                  {concept.strugglingStudents.length > 5 && (
                    <span className="text-[10px] font-bold text-gray-400 py-1.5">
                      + {concept.strugglingStudents.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
