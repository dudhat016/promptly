import { GoogleGenAI, Modality } from "@google/genai";
import { ImageType, ReferenceImage } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const textModel = 'gemini-2.5-flash';
const imageModel = 'gemini-2.5-flash-image';

export const generateChatResponse = async (history: { role: string; parts: { text: string }[] }[], newMessage: string): Promise<string> => {
    try {
        const chat = ai.chats.create({
            model: textModel,
            history: history,
            config: {
                systemInstruction: "You are a helpful and inspiring faith-based AI assistant. Provide thoughtful, encouraging, and wise responses grounded in positive principles. Your name is FaithAI.",
            },
        });
        const response = await chat.sendMessage({ message: newMessage });
        return response.text;
    } catch (error) {
        console.error("Error generating chat response:", error);
        return "I'm sorry, I encountered an error. Please try again.";
    }
};

export const generateMagicPrompt = async (basePrompt: string): Promise<string> => {
    try {
        const fullPrompt = `Based on the user's idea "${basePrompt}", generate a "magic prompt" for an AI image generator. The prompt should be highly detailed, vivid, and artistic, describing a faith-inspired scene. Include specifics about lighting, color palette, style (e.g., stained glass, ethereal, photorealistic), and emotional tone. The final output should ONLY be the generated prompt itself, without any introductory text.`;
        const response = await ai.models.generateContent({
            model: textModel,
            contents: fullPrompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating magic prompt:", error);
        return "Error creating magic prompt.";
    }
};

export const generateJesusPrompt = async (): Promise<string> => {
    try {
        const prompt = `Generate a vivid, artistic, and respectful description of Jesus Christ suitable for an AI image generator. Focus on details that would translate well into a visual image, such as his expression (e.g., compassionate, serene), traditional attire (e.g., simple robes), the setting (e.g., Galilean hills, shores of the sea), and the lighting (e.g., soft morning light, divine glow). The final output should ONLY be the description itself, without any introductory text like "Here is a description:".`;
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating Jesus prompt:", error);
        return "Error generating description.";
    }
};

export const generateImage = async (prompt: string, imageType: ImageType, referenceImage?: ReferenceImage, coloringStyle?: string): Promise<string> => {
    let finalPrompt = prompt;
    const subject = prompt; // Use the incoming prompt as the subject for more detailed templates

    switch (imageType) {
        case 'clipart':
            finalPrompt = `Faith-based clipart, simple, clean lines, vector style, isolated on a white background. Subject: ${subject}`;
            break;
        case 'stock-photo':
            finalPrompt = `High-quality, realistic stock photo, faith-inspired, cinematic lighting. Subject: ${subject}`;
            break;
        case 'coloring-page':
            switch (coloringStyle) {
                case 'Inspirational Quotes':
                    finalPrompt = `Coloring page featuring the inspirational quote "${subject}", surrounded by thematic faith-based illustrations like doves, crosses, or floral patterns. Clean black and white line art.`;
                    break;
                case 'Chibi/Cartoon Style':
                    finalPrompt = `Cute chibi cartoon style coloring page, adorable characters, bold and simple lines, faith-themed, black and white line art. Subject: ${subject}`;
                    break;
                case 'Character Portrait':
                    finalPrompt = `Beautiful character portrait coloring page, detailed face and hair, clean black and white lines, elegant and inspiring, faith-themed. Subject: ${subject}`;
                    break;
                case 'Biblical Scenes':
                    finalPrompt = `A biblical scene coloring page, clean black and white line art, detailed environment and characters in historical attire. Scene: ${subject}`;
                    break;
                case 'Stained Glass Style':
                    finalPrompt = `Intricate stained glass window design coloring page, bold black lines separating sections, faith-themed patterns and imagery, black and white line art. Subject: ${subject}`;
                    break;
                case 'Praying Hands & Symbols':
                    finalPrompt = `A coloring page focused on religious symbols, clean black and white line art, faith-themed. Subject: ${subject}. Examples: praying hands, a cross with flowers, a dove.`;
                    break;
                case 'Detailed Line Art':
                default:
                    finalPrompt = `Black and white, clean line art, coloring book page for adults, intricate details, faith-themed. Subject: ${subject}`;
                    break;
            }
            break;
    }
    
    const parts: ({ text: string } | { inlineData: { data: string; mimeType: string } })[] = [{ text: finalPrompt }];

    if (referenceImage) {
        parts.unshift({
            inlineData: {
                data: referenceImage.data,
                mimeType: referenceImage.mimeType,
            },
        });
    }

    try {
        const response = await ai.models.generateContent({
            model: imageModel,
            contents: { parts: parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const firstPart = response.candidates?.[0]?.content?.parts[0];
        if (firstPart && firstPart.inlineData) {
            return firstPart.inlineData.data;
        } else {
            throw new Error("No image data found in response.");
        }
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate image. Please check the prompt and try again.");
    }
};

export const generateEbookContent = async (topic: string): Promise<string> => {
    try {
        const prompt = `Write a short, uplifting faith-based ebook chapter on the topic of "${topic}". The chapter should be around 500 words, with a clear introduction, 2-3 main points with scriptural or inspirational examples, and a concluding thought. Format it using Markdown with a main heading for the chapter title and subheadings for the main points.`;
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating ebook content:", error);
        return "Error generating content. Please try a different topic.";
    }
};