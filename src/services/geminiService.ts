import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

function getAI() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please add VITE_GEMINI_API_KEY to your .env file.");
  }
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export async function generateAIPrompt(description: string, modelType: string) {
  const promptText = `Act as an expert prompt engineer. Create a high-quality, structured AI prompt for ${modelType} based on this description: "${description}". 
  The prompt should be professional, use clear instructions, and include placeholders if necessary (e.g., [TOPIC]). 
  Return only the prompt text itself.`;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: promptText,
    });
    return response.text || "Failed to generate prompt.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
