// Path: frontend/src/components/learning/ConceptVisualizer.jsx
import React from 'react';
import { motion } from 'framer-motion';
import AutoTranslate from '../common/AutoTranslate.jsx';

const FractionVisualizer = ({ value, parts = 10 }) => {
  const [num, den] = value.split('/').map(Number);
  const percentage = (num / den) * 100;

  return (
    <div className="space-y-6 py-4">
      <div className="flex justify-between items-center px-2">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Visualizing {value}</span>
        <span className="text-xl font-black text-violet-600">{Math.round(percentage)}%</span>
      </div>
      
      {/* Circle Representation */}
      <div className="flex justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="10"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - num / den)}`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="text-center">
                <div className="text-lg font-black text-gray-900 border-b-2 border-gray-900 leading-none pb-0.5">{num}</div>
                <div className="text-lg font-black text-gray-900 leading-none pt-0.5">{den}</div>
             </div>
          </div>
        </div>
      </div>

      {/* Bar Representation */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
          <span>Part</span>
          <span>Whole</span>
        </div>
        <div className="h-10 w-full bg-gray-100 rounded-2xl p-1 flex gap-1">
          {Array.from({ length: den }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`flex-1 rounded-xl transition-colors duration-500 ${
                i < num ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500' : 'bg-white'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const DecimalVisualizer = ({ value }) => {
  const val = parseFloat(value);
  const boxes = 100;
  const filled = Math.round(val * 100);

  return (
    <div className="space-y-4 py-4">
       <div className="flex justify-between items-center px-2">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Grid Representation</span>
        <span className="text-xl font-black text-emerald-600">{value}</span>
      </div>
      <div className="grid grid-cols-10 gap-1 bg-gray-100 p-2 rounded-2xl">
        {Array.from({ length: boxes }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: (i % 10) * 0.05 }}
            className={`aspect-square rounded-sm ${
              i < filled ? 'bg-emerald-500 shadow-sm shadow-emerald-200' : 'bg-white'
            }`}
          />
        ))}
      </div>
      <p className="text-[10px] text-center text-gray-400 font-medium">Each small box represents 0.01</p>
    </div>
  );
};

import scienceImg from '../../assets/visuals/science.png';
import mathImg from '../../assets/visuals/mathematics.png';
import socialImg from '../../assets/visuals/social.png';
import englishImg from '../../assets/visuals/english.png';

export default function ConceptVisualizer({ type, value, topic, visualSvg }) {
  const renderVisualizer = () => {
    const t = topic?.toLowerCase() || '';
    
    if (t.includes('fraction') || (value && value.includes('/'))) {
      return <FractionVisualizer value={value} />;
    }
    if (t.includes('decimal') || (value && value.includes('.'))) {
      return <DecimalVisualizer value={value} />;
    }

    // Dynamic AI Visualizer (Runtime Generated)
    if (visualSvg) {
      return (
        <div className="relative group overflow-hidden rounded-[2rem] bg-white border border-gray-100 p-8 flex flex-col items-center">
           <div className="flex justify-between items-center w-full mb-6">
              <span className="text-[10px] font-black text-violet-400 uppercase tracking-[0.2em]">Neural Insight Visualization</span>
              <div className="w-6 h-6 bg-violet-50 rounded-lg flex items-center justify-center text-xs">✨</div>
           </div>
           
           <div className="w-full aspect-square max-w-[240px] relative">
              <div 
                className="w-full h-full animate-pop"
                dangerouslySetInnerHTML={{ __html: visualSvg }}
              />
              {/* Scanning Bar */}
              <motion.div 
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-[1px] bg-violet-400/30 shadow-[0_0_8px_rgba(139,92,246,0.2)]"
              />
           </div>
           
           <div className="mt-6 text-center">
              <AutoTranslate as="p" className="text-sm font-bold text-gray-800">Visualizing {topic}</AutoTranslate>
              <AutoTranslate as="p" className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-1">Generated by AI Learning Engine</AutoTranslate>
           </div>
        </div>
      );
    }
    
    // Generic AI Fallback: Premium Generated Assets
    const getSubjectAsset = () => {
      if (t.includes('science') || t.includes('plant') || t.includes('nutrition')) return scienceImg;
      if (t.includes('math')) return mathImg;
      if (t.includes('social') || t.includes('civilization') || t.includes('history')) return socialImg;
      if (t.includes('english') || t.includes('verb') || t.includes('grammar')) return englishImg;
      return scienceImg; // Default
    };

    const asset = getSubjectAsset();

    return (
      <div className="relative group overflow-hidden rounded-[2rem]">
        <motion.div
          initial={{ scale: 1.1, filter: 'blur(10px)' }}
          animate={{ scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8 }}
          className="relative aspect-video w-full"
        >
          <img 
            src={asset} 
            alt={topic} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </motion.div>
        
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-lg">
               💡
            </div>
            <AutoTranslate as="span" className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em]">
              AI Neural Visualization
            </AutoTranslate>
          </div>
          <AutoTranslate as="h3" className="text-xl font-black text-white leading-tight">
            Visualizing {topic}...
          </AutoTranslate>
        </div>

        {/* AI Scanning Effect */}
        <motion.div 
          animate={{ left: ['-100%', '200%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
        />
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm"
    >
      {renderVisualizer()}
    </motion.div>
  );
}
