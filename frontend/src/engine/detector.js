// Path: frontend/src/engine/detector.js

/**
 * Gap Detection Engine
 * Online: Uses AI (Groq) to classify student mistakes
 * Offline: Uses JSON rule-based matching
 */

import fractionsRules from './rules/fractions.json';

const AI_TIMEOUT = 8000; // 8 seconds timeout for AI calls

/**
 * Main detection function
 */
export async function detectGap({
  topic,
  question,
  correctAnswer,
  studentAnswer,
  grade,
  subject,
}) {
  // Normalize answers for comparison
  const normalizedStudent = normalizeAnswer(studentAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);

  // If answer is correct, no gap to detect
  if (normalizedStudent === normalizedCorrect) {
    return {
      gapType: null,
      confidence: 1.0,
      reasoning: 'Answer is correct.',
      hint: null,
      isOnline: false,
    };
  }

  // If question is an object, try to find a matching misconception
  if (typeof question === 'object' && question.misconceptions) {
    const matchingMisconception = question.misconceptions.find(m => 
      normalizeAnswer(m.studentAnswer) === normalizedStudent
    );

    if (matchingMisconception) {
      return {
        gapType: matchingMisconception.gapType,
        confidence: matchingMisconception.confidence || 0.9,
        reasoning: matchingMisconception.reason || matchingMisconception.reasoning,
        hint: matchingMisconception.hint || null,
        story: matchingMisconception.story || null,
        isOnline: false,
      };
    }
  }

  // Try online detection first
  if (navigator.onLine) {
    try {
      const result = await callGroq(topic, question, correctAnswer, studentAnswer, grade, subject);
      if (result) {
        return { ...result, isOnline: true };
      }
    } catch (error) {
      console.error('Online detection failed, falling back to offline:', error);
    }
  }

  // Fallback to offline rule-based detection
  const offlineResult = detectOffline(topic, question, correctAnswer, studentAnswer);
  return { ...offlineResult, isOnline: false };
}

/**
 * Call Groq API (OpenAI-compatible endpoint)
 */
async function callGroq(topic, question, correctAnswer, studentAnswer, grade, subject) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    console.warn('No Groq API key found, falling back to offline');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are an expert K-12 educational diagnostician for Indian students.
Classify the student's mistake strictly as one of:

conceptual: wrong mental model of the concept
procedural: correct concept but execution error
careless: correct method, arithmetic slip
unknown: insufficient information to classify

Respond ONLY with valid JSON. No markdown, no explanation outside JSON.
Schema: { 
  "gapType": string, 
  "confidence": float 0-1, 
  "reasoning": string, 
  "hint": string, 
  "visualSvg": "string (A minimalist, clean SVG code snippet illustrating the concept or comparing the student's error with the correct logic. viewBox='0 0 100 100'. Use #8B5CF6 for correct parts and #EF4444 for error parts. NO text.)" 
}`,
          },
          {
            role: 'user',
            content: `Subject: ${subject} | Grade: ${grade} | Topic: ${topic}
Question: ${question}
Correct answer: ${correctAnswer}
Student's answer: ${studentAnswer}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Groq API error:', response.status, response.statusText);
      return null;
    }

    // Safely parse JSON
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse Groq response as JSON:', text);
      return null;
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    // Parse JSON from response (handle potential markdown wrapping)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate response
    if (!['conceptual', 'procedural', 'careless', 'unknown'].includes(parsed.gapType)) {
      return null;
    }

    return {
      gapType: parsed.gapType,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      reasoning: parsed.reasoning || 'No reasoning provided.',
      hint: parsed.hint || null,
      visualSvg: parsed.visualSvg || null,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.warn('Groq API call timed out');
    } else {
      console.error('Groq API call failed:', error);
    }
    return null;
  }
}

export async function generateFollowUpQuestion(originalQuestion, gapType, studentAnswer, topic) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are an expert tutor. The student answered the question "${originalQuestion.question}" incorrectly with "${studentAnswer}".
This was identified as a "${gapType}" error in the topic of "${topic}".
Please generate a single follow-up multiple choice question that tests this exact concept again to see if they learned from their mistake.

CRITICAL RULES:
1. The question MUST be DIFFERENT from the original question. Do not just rephrase it.
2. Provide 4 options (A, B, C, D).
3. The explanation should be encouraging.

Return ONLY valid JSON matching this schema:
{
  "id": "q_followup",
  "question": "The question text",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "A",
  "explanation": "Why this is correct",
  "concept": "${originalQuestion.concept || 'follow-up'}",
  "difficulty": ${originalQuestion.difficulty || 1},
  "misconceptions": []
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    if (response.ok) {
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse Groq follow-up response:', text);
        return null;
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const generated = JSON.parse(jsonMatch[0]);
        generated.id = `followup_${Date.now()}`;
        return generated;
      }
    }
  } catch (err) {
    console.error('Failed to generate follow-up question', err);
  }
  return null;
}

/**
 * Offline rule-based detection
 */
function detectOffline(topic, question, correctAnswer, studentAnswer) {
  const normalizedStudent = normalizeAnswer(studentAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);

  // Load rules for the topic
  let rules = [];
  if (topic === 'fractions') {
    rules = fractionsRules.rules || [];
  }

  // Try each rule
  for (const rule of rules) {
    const matcher = getMatcherFunction(rule.matchFn);
    if (matcher && matcher(normalizedStudent, normalizedCorrect, question)) {
      return {
        gapType: rule.gapType,
        confidence: rule.confidence,
        reasoning: rule.description,
        hint: rule.hint,
      };
    }
  }

  // Universal Numeric Matchers (Topic Independent)
  if (checkDecimalSlip(normalizedStudent, normalizedCorrect)) {
    return {
      gapType: 'careless',
      confidence: 0.8,
      reasoning: 'It looks like a simple decimal point slip. You know the value but misplaced the dot!',
      hint: 'Take another look at where the decimal point should be.',
    };
  }

  if (checkInverseError(normalizedStudent, normalizedCorrect)) {
    return {
      gapType: 'conceptual',
      confidence: 0.7,
      reasoning: 'You swapped the numerator and denominator or inverted the value.',
      hint: 'Remember which part represents the "part" and which represents the "whole".',
    };
  }

  if (checkOffByOne(normalizedStudent, normalizedCorrect)) {
    return {
      gapType: 'careless',
      confidence: 0.6,
      reasoning: 'You were so close! This looks like a small arithmetic slip.',
      hint: 'Double check your subtraction or addition steps.',
    };
  }

  // No rule matched
  return {
    gapType: 'unknown',
    confidence: 0.5,
    reasoning: 'Could not determine the type of mistake from available rules.',
    hint: null,
  };
}

/**
 * Helper matcher functions
 */

function checkDenominatorAddition(studentAnswer, correctAnswer) {
  // Check if student added numerators AND denominators (e.g., 1/2+1/3=2/5)
  const parts = studentAnswer.split('/');
  if (parts.length !== 2) return false;

  const correctParts = correctAnswer.split('/');
  if (correctParts.length !== 2) return false;

  const studentNum = parseInt(parts[0]);
  const studentDen = parseInt(parts[1]);
  const correctNum = parseInt(correctParts[0]);
  const correctDen = parseInt(correctParts[1]);

  // If student answer has different numerator AND denominator from correct
  return studentNum !== correctNum && studentDen !== correctDen;
}

function checkUnsimplifiedProduct(studentAnswer, correctAnswer) {
  // Check if student multiplied correctly but didn't simplify
  const parts = studentAnswer.split('/');
  if (parts.length !== 2) return false;

  const num = parseInt(parts[0]);
  const den = parseInt(parts[1]);

  // Check if the fraction can be simplified (has common factor > 1)
  const gcd = findGCD(num, den);
  return gcd > 1;
}

function checkNumeratorOnlyComparison(studentAnswer, correctAnswer) {
  // Check if student compared by numerators only
  const lowerStudent = studentAnswer.toLowerCase();
  const lowerCorrect = correctAnswer.toLowerCase();

  // If student got it wrong and the answer involves comparing
  return lowerStudent !== lowerCorrect;
}

function checkFractionOfQuantity(studentAnswer, correctAnswer) {
  // Check if student divided instead of multiplying for fraction of quantity
  const studentNum = parseFloat(studentAnswer);
  const correctNum = parseFloat(correctAnswer);

  if (isNaN(studentNum) || isNaN(correctNum)) return false;

  // If student answer is half of correct answer, they might have divided by 2 instead of 3
  return Math.abs(studentNum * 2 - correctNum) < 0.01;
}

function checkMixedNumberConversion(studentAnswer, correctAnswer) {
  // Check if student added whole + numerator instead of whole × den + numerator
  const parts = studentAnswer.split('/');
  if (parts.length !== 2) return false;

  const correctParts = correctAnswer.split('/');
  if (correctParts.length !== 2) return false;

  const studentNum = parseInt(parts[0]);
  const studentDen = parseInt(parts[1]);
  const correctNum = parseInt(correctParts[0]);
  const correctDen = parseInt(correctParts[1]);

  // If denominator matches but numerator is wrong
  return studentDen === correctDen && studentNum !== correctNum;
}

function checkDecimalSlip(student, correct) {
  const sNum = student.replace(/[^0-9]/g, '');
  const cNum = correct.replace(/[^0-9]/g, '');
  // If digits are exactly the same but strings are different (decimal slip)
  return sNum === cNum && sNum.length > 0 && student !== correct;
}

function checkInverseError(student, correct) {
  const sParts = student.split('/');
  const cParts = correct.split('/');
  if (sParts.length === 2 && cParts.length === 2) {
    return sParts[0] === cParts[1] && sParts[1] === cParts[0];
  }
  return false;
}

function checkOffByOne(student, correct) {
  const sNum = parseFloat(student);
  const cNum = parseFloat(correct);
  if (isNaN(sNum) || isNaN(cNum)) return false;
  return Math.abs(sNum - cNum) === 1 || Math.abs(sNum - cNum) === 10;
}

/**
 * Get matcher function by name
 */
function getMatcherFunction(name) {
  const matchers = {
    checkDenominatorAddition,
    checkUnsimplifiedProduct,
    checkNumeratorOnlyComparison,
    checkFractionOfQuantity,
    checkMixedNumberConversion,
  };
  return matchers[name] || null;
}

/**
 * Utility functions
 */

function normalizeAnswer(answer) {
  if (!answer) return '';
  return answer
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\\s+/g, '');
}

function findGCD(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}
