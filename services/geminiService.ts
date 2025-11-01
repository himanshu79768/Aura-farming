import { GoogleGenAI, Type } from "@google/genai";
import { Quote, Mood, AuraData } from '../types';

export const fetchQuotes = async (): Promise<Quote[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Generate a list of 50 short, powerful, and uplifting quotes or affirmations for focus, calm, and motivation. Please include a diverse range of authors, with a significant portion from Indian philosophers, leaders, and texts (like Vivekananda, Gandhi, the Upanishads, etc.). Authors can be famous figures or 'Anonymous'. Return as a JSON array.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: {
                type: Type.STRING,
                description: 'The quote text.',
              },
              author: {
                type: Type.STRING,
                description: 'The author of the quote.',
              },
            },
            required: ['text', 'author'],
          },
        },
      },
    });

    const jsonString = response.text.trim();
    const parsedQuotes: { text: string; author: string }[] = JSON.parse(jsonString);
    
    // Use crypto.randomUUID for a robust unique string ID
    return parsedQuotes.map((q) => ({ ...q, id: crypto.randomUUID() }));

  } catch (error) {
    console.error("Error fetching quotes from Gemini:", error);
    return [];
  }
};

export const fetchJournalPrompt = async (): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Generate a short, insightful, and open-ended journal prompt to encourage self-reflection. It should be a single question or a short statement to ponder.",
        });
        
        let prompt = response.text.trim();
        if ((prompt.startsWith('"') && prompt.endsWith('"')) || (prompt.startsWith("'") && prompt.endsWith("'"))) {
            prompt = prompt.substring(1, prompt.length - 1);
        }
        return prompt;

    } catch (error) {
        console.error("Error fetching journal prompt from Gemini:", error);
        return "What are you grateful for today?";
    }
};

// FIX: Implemented the missing 'fetchAuraCheckin' function to resolve the import error.
export const fetchAuraCheckin = async (mood: Mood, name: string, timeOfDay: 'morning' | 'afternoon' | 'evening'): Promise<AuraData> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `Generate a personalized "aura check-in" for a user named ${name}. The user is feeling ${mood} during the ${timeOfDay}.
      The response should be encouraging, insightful, and slightly mystical.
      Provide the following in a JSON object:
      1. "auraReading": A short, imaginative description of their current aura (e.g., "a gentle, glowing lavender with flecks of silver").
      2. "affirmation": A short, powerful affirmation for them to repeat.
      3. "suggestion": A simple, actionable suggestion for their current state (e.g., "Try a 5-minute breathing exercise.").`;
      
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            auraReading: { type: Type.STRING },
            affirmation: { type: Type.STRING },
            suggestion: { type: Type.STRING },
          },
          required: ['auraReading', 'affirmation', 'suggestion'],
        },
      },
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString);

  } catch (error) {
    console.error("Error fetching aura check-in from Gemini:", error);
    // Return a default/fallback response
    return {
      auraReading: "A calm, steady glow of deep blue.",
      affirmation: "I am centered, calm, and in control.",
      suggestion: "Take a few deep, slow breaths.",
    };
  }
};