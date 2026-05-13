import { GoogleGenAI, Modality } from "@google/genai";

// Helper to convert File to a base64 string and format it for the API
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export async function generateImage(prompt: string, referenceFiles: File[]): Promise<string> {
  // Ensure the API key is available
  if (!process.env.API_KEY) {
    throw new Error("API key not found. Please set the API_KEY environment variable.");
  }

  if (referenceFiles.length === 0) {
      throw new Error("A reference image is required for twin generation.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // Use the first reference image as the base for the twin
    const imagePart = await fileToGenerativePart(referenceFiles[0]);
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [imagePart, textPart],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });
    
    // Extract the generated image from the response
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        // The API returns the image data, we'll display it as a PNG.
        return `data:image/png;base64,${base64ImageBytes}`;
      }
    }
    
    throw new Error("No images were generated in the response.");

  } catch (error) {
    console.error("Error generating image with Gemini:", error);
    if (error instanceof Error) {
        return Promise.reject(error.message);
    }
    return Promise.reject("An unknown error occurred during image generation.");
  }
}
