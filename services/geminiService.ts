import { GoogleGenAI, Type } from "@google/genai";
import { Quote, Mood } from '../types';

export const fetchQuotes = async (): Promise<Quote[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Generate a list of 20 short, powerful, and uplifting quotes or affirmations for focus, calm, and motivation. Authors can be famous figures or 'Anonymous'. Return as a JSON array.",
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

export const fetchHomepageContent = async (mood: Mood, name: string, timeOfDay: 'morning' | 'afternoon' | 'evening'): Promise<{ greeting: string; thought: string; }> => {
    const fallback = { greeting: `Hello, ${name}`, thought: "Welcome to your peaceful space. Tap the refresh icon for a new thought." };

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a short, fresh, and welcoming homepage message for a wellness app. It's currently the ${timeOfDay}. The user's name is ${name} and their current mood is set to '${mood}'. Provide a friendly, time-appropriate greeting and a very short (1-2 sentence) "thought for the day" that matches the mood.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        greeting: { type: Type.STRING, description: `A friendly, time-appropriate greeting for the ${timeOfDay}, like 'Good ${timeOfDay}, [Name]'` },
                        thought: { type: Type.STRING, description: "A short, mood-appropriate thought for the day." }
                    },
                    required: ['greeting', 'thought']
                }
            }
        });
        
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error fetching homepage content from Gemini:", error);
        return fallback;
    }
};

export const fetchAuraCheckin = async (mood: Mood, name: string, timeOfDay: 'morning' | 'afternoon' | 'evening'): Promise<{ auraReading: string; affirmation: string; suggestion: string; }> => {
    const fallback = { 
        auraReading: "Your energy is bright and full of potential today.",
        affirmation: "I am open to the possibilities of this beautiful day.",
        suggestion: "Take a moment to close your eyes and take three deep breaths."
    };

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are an AI wellness guide for an app called Aura. The user, ${name}, has selected their current mood as '${mood}'. It's currently the ${timeOfDay}. Generate a personalized 'Aura Check-in'. Provide a response in JSON format with three keys: "auraReading" (a short, 1-2 sentence encouraging paragraph about their current energy), "affirmation" (a single, powerful affirmation sentence), and "suggestion" (a short, actionable suggestion, like 'Try a 5-minute breathing exercise' or 'Stretch for 2 minutes'). The tone should be positive, insightful, and slightly mystical, fitting the 'Aura' theme.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        auraReading: { type: Type.STRING, description: "A short, encouraging paragraph about the user's current energy." },
                        affirmation: { type: Type.STRING, description: "A single, powerful affirmation sentence." },
                        suggestion: { type: Type.STRING, description: "A short, actionable wellness suggestion." }
                    },
                    required: ['auraReading', 'affirmation', 'suggestion']
                }
            }
        });
        
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error fetching aura check-in from Gemini:", error);
        return fallback;
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
