import React, { createContext, useContext, useState, useEffect } from 'react';
import { MotionConfig } from 'framer-motion';

const AnimationContext = createContext();

export const useAnimations = () => useContext(AnimationContext);

export const AnimationProvider = ({ children }) => {
  const [animationsEnabled, setAnimationsEnabled] = useState(() => {
    const saved = localStorage.getItem('jnanasetu_animations');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleAnimations = () => {
    setAnimationsEnabled(prev => {
      const next = !prev;
      localStorage.setItem('jnanasetu_animations', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AnimationContext.Provider value={{ animationsEnabled, toggleAnimations }}>
      <MotionConfig transition={animationsEnabled ? undefined : { duration: 0 }}>
        {children}
      </MotionConfig>
    </AnimationContext.Provider>
  );
};
