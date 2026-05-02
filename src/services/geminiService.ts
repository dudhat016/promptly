import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateAIPrompt(description: string, modelType: string) {
  const promptText = `Act as an expert prompt engineer. Create a high-quality, structured AI prompt for ${modelType} based on this description: "${description}". 
  The prompt should be professional, use clear instructions, and include placeholders if necessary (e.g., [TOPIC]). 
  Return only the prompt text itself.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: promptText,
    });
    return response.text || "Failed to generate prompt.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
