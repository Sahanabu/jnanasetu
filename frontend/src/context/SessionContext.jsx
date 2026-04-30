// Path: frontend/src/context/SessionContext.jsx
import React, { createContext, useState, useContext } from 'react';
import { StudentContext } from './StudentContext.jsx';
import { saveEvent } from '../db/events.js';

export const SessionContext = createContext({
  sessionId: null,
  currentTopic: null,
  currentQuestion: null,
  startSession: () => {},
  endSession: () => {},
  logEvent: () => {},
  sessionEvents: [],
});

export function SessionProvider({ children }) {
  const { student } = useContext(StudentContext);
  const [sessionId, setSessionId] = useState(null);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [sessionEvents, setSessionEvents] = useState([]);

  const startSession = (topic, question) => {
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(id);
    setCurrentTopic(topic);
    setCurrentQuestion(question);
    setSessionEvents([]);
    return id;
  };

  const endSession = () => {
    setSessionId(null);
    setCurrentTopic(null);
    setCurrentQuestion(null);
  };

  const logEvent = async (eventData) => {
    if (!student?.studentId) return;

    const event = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      studentId: student.studentId,
      sessionId: sessionId || 'standalone',
      date: new Date().toISOString(),
      topic: currentTopic || eventData.topic,
      subtopic: eventData.subtopic || '',
      questionId: currentQuestion?.id || eventData.questionId || '',
      studentAnswer: eventData.studentAnswer || '',
      correctAnswer: eventData.correctAnswer || '',
      gapType: eventData.gapType || null,
      confidence: eventData.confidence || 0,
      correct: eventData.correct || false,
      selfFixed: eventData.selfFixed || false,
      modality: eventData.modality || 'text',
      synced: false,
      ...eventData,
    };

    try {
      await saveEvent(event);
      setSessionEvents((prev) => [...prev, event]);
    } catch (error) {
      console.error('Failed to log event:', error);
    }

    return event;
  };

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        currentTopic,
        currentQuestion,
        startSession,
        endSession,
        logEvent,
        sessionEvents,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
