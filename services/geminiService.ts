import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Quote, Mood, AuraData, AITask } from '../types';

const API_KEY = "AIzaSyA49vGVlbtSfVov5eCgQ4ZtHRIdeRI1d9s";

export const fetchQuotes = async (): Promise<Quote[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
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
    
    return parsedQuotes.map((q) => ({ ...q, id: crypto.randomUUID() }));

  } catch (error) {
    console.error("Error fetching quotes from Gemini:", error);
    return [];
  }
};

export const fetchJournalPrompt = async (): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
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

export const fetchAuraCheckin = async (mood: Mood, name: string, timeOfDay: 'morning' | 'afternoon' | 'evening'): Promise<AuraData | null> => {
    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `The user, ${name}, is feeling ${mood.toLowerCase()} in the ${timeOfDay}. Based on this, provide a concise, one-sentence "aura reading", a short, powerful "affirmation" for them, and a simple one-action "suggestion" (like 'Take 5 deep breaths' or 'Listen to one song'). Respond in JSON format.`,
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
        return JSON.parse(jsonString) as AuraData;
    } catch (error) {
        console.error("Error fetching Aura check-in from Gemini:", error);
        return null;
    }
};


export const processJournalWithAI = async (task: AITask, content: string, customPrompt?: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        let prompt = '';
        switch (task) {
            case 'GENERATE':
                prompt = `Generate a short journal entry based on this prompt: "${customPrompt}"`;
                break;
            case 'CONTINUE':
                prompt = `Continue writing this journal entry. Add one or two more paragraphs:\n\n${content}`;
                break;
            case 'SUMMARIZE':
                prompt = `Summarize this journal entry into a few bullet points:\n\n${content}`;
                break;
            case 'IMPROVE':
                 prompt = `Analyze the following journal entry for key themes, emotions, or subjects. Rewrite and improve it by structuring it with paragraphs, lists, and potentially headings. Where a visual could enhance a specific part of the text, insert a tag like <generate-image-prompt>a serene landscape with a river</generate-image-prompt>. Use this tag 1-2 times for the most impactful moments. Here is the entry:\n\n${content}`;
                break;
            case 'ASK':
                prompt = `Given the following journal entry, answer this question: "${customPrompt}"\n\nJournal Entry:\n${content}`;
                break;
            default:
                return "Unknown task";
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        
        return response.text.trim();
    } catch (error) {
        console.error("Error processing journal with AI:", error);
        return "Sorry, I couldn't process that request right now.";
    }
};

export const generateImageForJournal = async (prompt: string): Promise<string | null> => {
    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: `Generate an artistic, abstract, or metaphorical image representing the concept: ${prompt}. The style should be painterly and evocative, suitable for a journal.` }],
          },
          config: {
              responseModalities: [Modality.IMAGE],
          },
        });
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            return part.inlineData.data;
          }
        }
        return null;
    } catch (error) {
        console.error("Error generating image with AI:", error);
        return null;
    }
};