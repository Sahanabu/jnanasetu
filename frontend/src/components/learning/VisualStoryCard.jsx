import React from 'react';
import { motion } from 'framer-motion';
import AutoTranslate from '../common/AutoTranslate.jsx';

export default function VisualStoryCard({ story, currentStep, totalSteps }) {
  if (!story) return null;

  const step = story.steps[currentStep];
  
  // Culturally relevant visual metaphors
  const getVisual = (item) => {
    const map = {
      'roti': '🫓',
      'pizza': '🍕',
      'chocolate': '🍫',
      'candies': '🍬',
      'apples': '🍎',
      'mangoes': '🥭',
      'concept': '💡'
    };
    return map[item?.toLowerCase()] || '📦';
  };

  const visual = getVisual(story.entities?.item);

  return (
    <motion.div 
      key={currentStep}
      initial={{ opacity: 0, scale: 0.9, rotate: -1 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.9, rotate: 1 }}
      className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 shadow-2xl border border-white/10"
    >
      {/* Dynamic AI Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-transparent to-fuchsia-600/20 opacity-50" />
      
      {/* Animated Orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" 
      />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black text-violet-300 uppercase tracking-[0.2em] border border-white/10 inline-block mb-2">
              Step {currentStep + 1} of {totalSteps}
            </div>
            <AutoTranslate as="h4" className="text-white/40 text-[10px] font-bold uppercase tracking-widest pl-1">
              AI Visual Insight
            </AutoTranslate>
          </div>
          <div className="text-4xl filter drop-shadow-lg">
            {visual}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="min-h-[120px] flex flex-col justify-center">
            <AutoTranslate as="h3" className="text-xl sm:text-2xl font-black text-white leading-tight mb-4">
              {step}
            </AutoTranslate>
          </div>

          {/* AI-Generated SVG Illustration Container */}
          <div className="relative aspect-square w-full max-w-[200px] mx-auto bg-white/5 rounded-3xl p-4 border border-white/5 flex items-center justify-center group overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/10 to-fuchsia-500/10 group-hover:opacity-100 opacity-0 transition-opacity" />
             {story.svgIllustration ? (
               <div 
                 className="w-full h-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-700"
                 dangerouslySetInnerHTML={{ __html: story.svgIllustration }}
               />
             ) : (
               <div className="text-6xl opacity-20 grayscale group-hover:grayscale-0 transition-all duration-700">
                 {visual}
               </div>
             )}
             
             {/* Scanning Animation */}
             <motion.div 
               animate={{ top: ['0%', '100%', '0%'] }}
               transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
               className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400 to-transparent opacity-30 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
             />
          </div>
        </div>

        {currentStep === totalSteps - 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 bg-white/5 backdrop-blur-sm rounded-[2rem] border border-white/10"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs">✨</span>
              <p className="text-[10px] font-black text-violet-300 uppercase tracking-widest">Key Takeaway</p>
            </div>
            <p className="text-sm font-bold text-white italic leading-relaxed">
              "{story.moral}"
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
