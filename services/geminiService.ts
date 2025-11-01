import { GoogleGenAI, Type } from "@google/genai";
import { Quote, Mood, AuraData, AITask } from '../types';

const GEMINI_API_KEY = "AIzaSyA49vGVlbtSfVov5eCgQ4ZtHRIdeRI1d9s";

export const fetchQuotes = async (): Promise<Quote[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
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
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
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
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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

export const processJournalWithAI = async (
  task: AITask,
  content: string,
  customPrompt: string = ''
): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        let prompt = '';

        switch (task) {
            case 'GENERATE':
                prompt = `Generate a thoughtful and reflective journal entry based on the following prompt. Use markdown for formatting like headings, lists, bold, and italics where appropriate. Prompt: "${customPrompt}"`;
                break;
            case 'CONTINUE':
                prompt = `You are a creative writing assistant. Continue the following journal entry naturally from where it left off, maintaining the same tone and style. Add about 2-3 more paragraphs. Return only the new paragraphs, without repeating any of the original text. Here is the entry so far:\n\n---\n\n${content}`;
                break;
            case 'SUMMARIZE':
                prompt = `Summarize the key points, themes, and feelings of the following journal entry into 2-3 concise bullet points starting with '*'. Return only the bullet points. Here is the entry:\n\n---\n\n${content}`;
                break;
            case 'IMPROVE':
                prompt = `You are an expert editor and content organizer. Your task is to proofread, refine, and restructure the following journal entry.
1.  **Title:** If the entry doesn't seem to have a clear title within its content, add a suitable one as an <h2> heading at the very beginning.
2.  **Proofread:** Correct all grammar, spelling, and punctuation errors.
3.  **Formatting:**
    -   Remove any stray or unintentional formatting symbols (like stray * or #).
    -   Use clean HTML for formatting (e.g., <p>, <h2>, <strong>, <em>, <ul>, <li>). Ensure proper paragraph breaks with <p> tags.
    -   If the content is a Q&A, wrap the questions in <strong> tags.
    -   Insert <hr> tags where you see a clear thematic shift or separation of ideas.
    -   **Tables:** If the content compares items, lists pros and cons, or presents data that would benefit from a tabular format, structure it into a simple HTML <table> with a class="journal-table". Use <thead>, <tbody>, <th>, and <td> tags appropriately.
4.  **Structure:** Organize the content logically.
5.  **Voice:** Preserve the original author's voice and tone.
6.  **Output:** Return ONLY the improved and fully structured HTML content. Do not include any introductory phrases like "Here is the improved version:".

Here is the entry content:
---
${content}
---`;
                break;
            case 'ASK':
                prompt = `Based on the content of the following journal entry, please answer the user's question concisely.\n\nJournal Entry:\n---\n${content}\n---\n\nQuestion: "${customPrompt}"`;
                break;
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text.trim();

    } catch (error) {
        console.error(`Error processing journal with AI for task ${task}:`, error);
        return "Sorry, I couldn't process that request right now.";
    }
};