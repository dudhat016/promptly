import { GoogleGenAI, Modality } from "@google/genai";
import { GenerationOptions } from '../types';

// Fix: Initialize the GoogleGenAI client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function fileToGenerativePart(base64: string, mimeType: string) {
  return {
    inlineData: {
      data: base64.split(',')[1], // remove the "data:image/jpeg;base64," part
      mimeType
    },
  };
}

const buildGeneratorPrompt = (options: GenerationOptions): string => {
  const { character, style, setting, vibe, customPrompt } = options;
  const formattedCharacter = character.replace(/_/g, ' ');
  const formattedStyle = style.replace(/_/g, ' ');
  const formattedSetting = setting.replace(/_/g, ' ');

  let prompt = `Create a hyper-realistic, sexy, photorealistic portrait of a beautiful "baddie" with flawless, realistic skin and glamorous makeup.

**Style:** ${formattedStyle}.
**Character Concept:** A ${vibe} version of a ${formattedCharacter}.
**Setting:** A ${formattedSetting}.
**Overall Vibe:** High-fashion, luxurious, and captivating. The image must look like a real photograph from a professional photoshoot.

Emphasize dynamic lighting, rich textures (e.g., fabric, skin, surroundings), and a powerful, confident pose.
`;

  if (customPrompt) {
    prompt += `\n**Incorporate these specific details:** ${customPrompt}.`;
  }

  prompt += `\nEnsure the final image is ultra-realistic and visually stunning. No cartoonish or animated elements.`;
  
  return prompt;
};

export const generateImage = async (options: GenerationOptions): Promise<string> => {
  // Fix: Use a recommended model for general image generation.
  const model = 'gemini-2.5-flash-image';
  const prompt = buildGeneratorPrompt(options);

  try {
    // Fix: Call generateContent with the correct parameters for image generation.
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    // Fix: Correctly parse the response to extract the base64 image data.
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
    }
    throw new Error('No image data found in response.');
  } catch (error) {
    console.error('Error generating image:', error);
    throw new Error('Failed to generate image. Please check your prompt and try again.');
  }
};


export const analyzeImage = async (imageDataUrl: string, mimeType: string): Promise<string> => {
    // Fix: Use a recommended model for basic text tasks.
    const model = 'gemini-2.5-flash';
    const imagePart = fileToGenerativePart(imageDataUrl, mimeType);
    const textPart = { text: "Describe this image in detail, focusing on its style, content, and potential for creative holiday-themed edits." };
    
    try {
        // Fix: Call generateContent with image and text parts for analysis.
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
        });
        // Fix: Correctly extract the text response.
        return response.text;
    } catch (error) {
        console.error('Error analyzing image:', error);
        throw new Error('Failed to analyze image. The image might be invalid or the service could be unavailable.');
    }
};

export const editImage = async (imageDataUrl: string, mimeType: string, prompt: string): Promise<string> => {
    // Fix: Use a recommended model for image editing.
    const model = 'gemini-2.5-flash-image';
    const imagePart = fileToGenerativePart(imageDataUrl, mimeType);
    const textPart = { text: prompt };

    try {
        // Fix: Call generateContent with correct parameters for image editing.
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [imagePart, textPart],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        // Fix: Correctly parse the response to extract the base64 image data.
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            }
        }
        throw new Error('No edited image data found in response.');
    } catch (error) {
        console.error('Error editing image:', error);
        throw new Error('Failed to edit image. Please check your prompt and try again.');
    }
};