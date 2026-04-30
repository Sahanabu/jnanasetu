// Path: frontend/src/engine/storyEngine.js

/**
 * Story Engine - Generates visual story explanations for misconceptions.
 * Online: Calls Groq AI for dynamic story generation
 * Offline: Uses prebuilt story bank from the dataset
 */

import fractionsDataset from '../data/fractions.json';

const STORY_TIMEOUT = 8000;

/**
 * Generate a story for a given gap type and topic
 */
export async function generateStory(gapType, topic, entities, locale = 'en') {
  // Try online generation first
  if (navigator.onLine) {
    try {
      const result = await generateStoryOnline(gapType, topic, entities, locale);
      if (result) {
        return result;
      }
    } catch (error) {
      console.error('Online story generation failed, falling back to offline:', error);
    }
  }

  // Fallback to offline story bank
  return generateStoryOffline(gapType, topic);
}

/**
 * Online story generation via Groq AI
 */
async function generateStoryOnline(gapType, topic, entities, locale) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STORY_TIMEOUT);

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
            content: `You are an expert at creating educational stories for K-12 Indian students.
Generate a story explanation for a ${gapType} mistake in ${topic}.

IMPORTANT: ALL text (steps, highlight, moral) MUST be in the student's language: ${locale}.
If 'hi', use Hindi (Devanagari). If 'kn', use Kannada. If 'en', use English.

Return ONLY valid JSON. No markdown.

Schema:
{
  "template": "sharing | flow | transform | compare | area",
  "locale": "${locale}",
  "entities": { "item": string, "people": number, "container": string },
  "steps": [string x 6],
  "highlight": string,
  "moral": string,
  "svgIllustration": "string (A minimalist, clean SVG code snippet representing the concept. viewBox='0 0 100 100'. Use primary colors #8B5CF6, #EC4899, #10B981. NO text labels inside SVG.)"
}

If the topic is Math/Fractions, use culturally relevant items like roti, pizza, candies, chocolate bars.
If the topic is Science, use relevant biological or physical processes (e.g., energy flow, plant growth, water cycle).
If the topic is Social Studies, use historical or civic scenarios.
Each step should be one clear sentence. Generate exactly 6 steps.`,
          },
          {
            role: 'user',
            content: `Create a story for a student who made a ${gapType} error in ${topic}.
Entities: ${JSON.stringify(entities)}
Locale: ${locale}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name !== 'AbortError') {
      console.error('Story generation failed:', error);
    }
    return null;
  }
}

/**
 * Offline story generation from prebuilt dataset
 */
function generateStoryOffline(gapType, topic) {
  // Load from fractions dataset
  if (topic === 'fractions' && fractionsDataset.questions) {
    // Find a matching misconception story
    for (const question of fractionsDataset.questions) {
      for (const misconception of question.misconceptions) {
        if (misconception.gapType === gapType && misconception.story) {
          return {
            ...misconception.story,
            locale: 'en',
          };
        }
      }
    }

    // Fallback: return first available story
    const firstQuestion = fractionsDataset.questions[0];
    if (firstQuestion?.misconceptions?.[0]?.story) {
      return {
        ...firstQuestion.misconceptions[0].story,
        locale: 'en',
      };
    }
  }

  // Default fallback story
  return {
    template: 'flow',
    locale: 'en',
    entities: { item: 'concept', people: 1, container: 'mind' },
    steps: [
      'Let us understand this concept step by step.',
      'First, identify what the question is asking you to find.',
      'Think about the correct method to solve this type of problem.',
      'Apply each step of the method carefully.',
      'Check your answer to make sure it makes sense.',
      'Practice similar problems to build your confidence!',
    ],
    highlight: 'step_by_step',
    moral: 'Breaking down problems into steps makes them easier to solve.',
  };
}

/**
 * Get story for a specific misconception from the dataset
 */
export function getStoryForMisconception(questionId, misconceptionId) {
  if (!fractionsDataset.questions) return null;

  for (const question of fractionsDataset.questions) {
    if (question.id === questionId) {
      for (const misconception of question.misconceptions) {
        if (misconception.id === misconceptionId) {
          return misconception.story || null;
        }
      }
    }
  }
  return null;
}

/**
 * Get all stories for a topic
 */
export function getAllStoriesForTopic(topic) {
  if (topic === 'fractions' && fractionsDataset.questions) {
    const stories = [];
    for (const question of fractionsDataset.questions) {
      for (const misconception of question.misconceptions) {
        if (misconception.story) {
          stories.push({
            questionId: question.id,
            misconceptionId: misconception.id,
            gapType: misconception.gapType,
            story: misconception.story,
          });
        }
      }
    }
    return stories;
  }
  return [];
}
