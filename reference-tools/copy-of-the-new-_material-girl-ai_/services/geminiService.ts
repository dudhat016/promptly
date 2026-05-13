import { GoogleGenAI, Modality } from "@google/genai";
import { AspectRatio, IdentityControl } from "../types";

const fileToGenerativePart = (file: File): Promise<{mimeType: string, data: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        return reject(new Error("Failed to read file as base64 string."));
      }
      const base64Data = reader.result.split(',')[1];
      resolve({
        mimeType: file.type,
        data: base64Data,
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const getSystemPrompt = (identityControl: IdentityControl, imageCount: number): string => {
    if (identityControl !== 'exact') return '';

    const coupleInstruction = imageCount > 1
        ? "- **Identity:** Flawlessly match the facial identity from the reference photos. For couples, match each person to their respective photo. Poses should be natural and interactive."
        : "- **Identity:** Flawlessly match the facial identity (bone structure, features, skin tone) from the reference photo.";

    return `
**AI Twin Generation Instructions:**
- **Primary Goal:** Create a photorealistic AI Twin.
${coupleInstruction}
- **Body:** Use the reference photo's body shape as a guide, but render it in a perfected, idealized form.
- **Style:** The final output must be an ultra-high-quality, editorial fashion visual with a "Material Girl" aesthetic (confident, glamorous, luxury).
- **Realism:** Ensure realistic skin texture (pores, highlights), detailed fabrics, and correct anatomy (hands, fingers).
- **Lighting:** Use cinematic lighting and a shallow depth of field.
- **User's Request:** Now, apply the user's following style prompt to the AI Twin.
`.trim();
}


const getPromptPrefix = (identityControl: IdentityControl, isVideo: boolean = false): string => {
    switch (identityControl) {
        case 'exact':
            return '';
        case 'inspired':
            return `Create a new person with features heavily inspired by the reference photo, like a close sibling or an AI twin. The result should be flawless, gorgeous, and ultra-realistic. ${isVideo ? 'The video should portray the following:' : 'Apply the following style:'} `;
        case 'none':
            return '';
    }
}


export const editImage = async (prompt: string, imageFiles: File[], identityControl: IdentityControl): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imageParts = await Promise.all(imageFiles.map(fileToGenerativePart));
  
  const systemPrompt = getSystemPrompt(identityControl, imageFiles.length);
  const promptPrefix = getPromptPrefix(identityControl);
  const finalPrompt = `${systemPrompt}\n\n${promptPrefix}${prompt}`;


  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        ...imageParts.map(part => ({ inlineData: part })),
        {
          text: finalPrompt,
        },
      ],
    },
    config: {
        responseModalities: [Modality.IMAGE],
    },
  });

  const firstCandidate = response.candidates?.[0];

  if (firstCandidate?.content?.parts) {
    for (const part of firstCandidate.content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        const mimeType = part.inlineData.mimeType;
        return `data:${mimeType};base64,${base64ImageBytes}`;
      }
    }
  }

  console.error("Image generation failed. Full API response:", JSON.stringify(response, null, 2));

  if (response.promptFeedback?.blockReason) {
    throw new Error(`Request was blocked due to ${response.promptFeedback.blockReason}. Please adjust your prompt.`);
  }

  const finishReason = firstCandidate?.finishReason;
  if (finishReason && finishReason !== 'STOP') {
    throw new Error(`Image generation stopped unexpectedly. Reason: ${finishReason}. Please adjust your prompt or try again.`);
  }

  throw new Error("No image was generated. Please try a different prompt.");
};

const loadingMessages = [
    "Contacting the design studio...",
    "Stylists are reviewing your request...",
    "Prepping the digital runway...",
    "This look is a showstopper, it needs a moment...",
    "Rendering the final cut...",
    "Adding that luxury finish...",
];

export const generateVideo = async (
  prompt: string, 
  imageFile: File, 
  aspectRatio: AspectRatio,
  identityControl: IdentityControl,
  onProgress: (message: string) => void
): Promise<string> => {
   if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }
  // Veo requires a new instance to pick up the latest key from the dialog
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const imagePart = await fileToGenerativePart(imageFile);
  
  const systemPrompt = getSystemPrompt(identityControl, 1);
  const promptPrefix = getPromptPrefix(identityControl, true);
  const finalPrompt = `${systemPrompt}\n\n${promptPrefix}${prompt}`;


  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: finalPrompt,
    image: {
      imageBytes: imagePart.data,
      mimeType: imagePart.mimeType,
    },
    // The system prompt is not directly supported in generateVideos, so it's prepended to the main prompt.
    // The model is trained to understand this structure.
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio
    }
  });

  let messageIndex = 0;
  onProgress(loadingMessages[messageIndex]);
  
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
    messageIndex = (messageIndex + 1) % loadingMessages.length;
    onProgress(loadingMessages[messageIndex]);
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  if (operation.error) {
    throw new Error(`Operation failed: ${operation.error.message}`);
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    console.error("Video generation failed. Full operation response:", JSON.stringify(operation, null, 2));
    throw new Error("Video generation completed, but no download link was found.");
  }
  
  onProgress("Downloading your video...");
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  if(!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to download video: ${response.status} ${errorText}`);
  }

  const videoBlob = await response.blob();
  return URL.createObjectURL(videoBlob);
};