
import { GoogleGenAI, Chat, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

// --- CHATBOT SERVICE ---
let chatInstance: Chat | null = null;

const getChatInstance = () => {
  if (!chatInstance) {
    chatInstance = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are a sassy, confident, and knowledgeable fashion and style expert. Your name is 'Baddie Bot'. Give advice, hype up users, and provide inspiration with an empowering and trendy tone.",
      },
    });
  }
  return chatInstance;
};

export const chatWithAI = async (message: string) => {
  try {
    const chat = getChatInstance();
    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Error in chatWithAI:", error);
    return "Oops! Something went wrong. Please try again.";
  }
};


// --- IMAGE GENERATION SERVICE ---
export const generateImage = async (prompt: string, aspectRatio: string) => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `Create a hyper-realistic, fashion magazine-quality photo celebrating curvy and diverse body types. The model should be portrayed as confident and stylish. User prompt: ${prompt}`,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
            },
        });

        const base64ImageBytes: string | undefined = response.generatedImages[0]?.image.imageBytes;
        if (base64ImageBytes) {
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        }
        throw new Error("No image bytes returned from API.");

    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate image. Please check your prompt and try again.");
    }
};

// --- IMAGE ANALYSIS SERVICE ---
export const analyzeImage = async (image: File, prompt: string) => {
    try {
        const imagePart = await fileToGenerativePart(image);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] },
        });
        return response.text;
    } catch (error) {
        console.error("Error analyzing image:", error);
        throw new Error("Failed to analyze image.");
    }
};


// --- IMAGE EDITING SERVICE ---
export const editImage = async (image: File, prompt: string) => {
    try {
        const imagePart = await fileToGenerativePart(image);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            }
        }
        throw new Error("No edited image returned from API.");

    } catch (error) {
        console.error("Error editing image:", error);
        throw new Error("Failed to edit image.");
    }
};
