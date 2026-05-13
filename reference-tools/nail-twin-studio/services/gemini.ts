import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:image/xyz;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const generateNailArt = async (
  handFile: File,
  designFile: File | null,
  fullPromptContext: string
): Promise<string> => {
  const handBase64 = await fileToBase64(handFile);
  
  const parts: any[] = [
    {
      inlineData: {
        mimeType: handFile.type,
        data: handBase64,
      },
    },
  ];

  if (designFile) {
    const designBase64 = await fileToBase64(designFile);
    parts.push({
      inlineData: {
        mimeType: designFile.type,
        data: designBase64,
      },
    });
  }

  // Strict "Instagram Lifestyle" prompt based on user specifications
  const promptText = `
    You are "Nail Twin Studio," an expert high-end beauty retoucher and AI photographer.

    YOUR TASK:
    Generate a photorealistic, ultra-high-resolution (4K) image of the user's hands featuring a specific nail design, pose, and scene.

    INPUTS:
    1. **Hand Reference (Image 1)**: This is the SOURCE IDENTITY.
       - You MUST preserve the skin tone and general finger structure of this person.
       - **CRITICAL RETOUCHING**: Apply high-end magazine retouching. Skin must look hydrated, glowing, and flawless. Remove wrinkles, dry cuticles, and veins.
    
    ${designFile 
      ? '2. **Design Reference (Image 2)**: Extract the art style, pattern, and color from this image and apply it to the nails.' 
      : ''}

    3. **GENERATION DETAILS**:
    ${fullPromptContext}

    TECHNICAL SPECIFICATIONS:
    - **Image Style**: High-end Instagram lifestyle photography, Influencer quality.
    - **Lighting**: Soft natural light with subtle specular highlights on the nails (glossy/chrome reflection).
    - **Focus**: Sharp focus on the nails, slight creamy bokeh (depth of field) on the background.
    - **Anatomy**: Feminine, well-manicured hands. NO extra fingers. NO distorted joints.
    - **Nails**: Salon-perfect application. Smooth c-curves, clean cuticles, consistent shape.

    EXECUTION RULES:
    - If the prompt requests a specific **POSE** (e.g., "fingers spread", "holding wine glass"), you MUST adjust the hand pose from the reference image to match the request while keeping the skin tone/identity.
    - If the prompt requests a specific **SCENE** (e.g., "luxury car", "silk sheets"), generate that specific background context seamlessly.
    - Ensure the nail design is cohesive with the scene lighting.

    Output ONLY the generated image.
  `;

  parts.push({ text: promptText });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: parts,
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  const part = response.candidates?.[0]?.content?.parts?.[0];
  if (part && part.inlineData) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("No image generated");
};

export const editImage = async (imageFile: File, prompt: string): Promise<string> => {
  const base64 = await fileToBase64(imageFile);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64,
            mimeType: imageFile.type,
          },
        },
        { text: prompt },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  const part = response.candidates?.[0]?.content?.parts?.[0];
  if (part && part.inlineData) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("No image generated");
};

export const generateTextResponse = async (prompt: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite-latest',
    contents: prompt,
  });
  return response.text || "No response generated.";
};

export const generateChatResponse = async (history: any[], message: string): Promise<string> => {
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    history: history,
    config: {
      systemInstruction: "You are a helpful beauty assistant for Nail Twin Studio. You know about nail trends, care, and designs.",
    }
  });
  
  const response = await chat.sendMessage({ message });
  return response.text || "";
};

export const generateFromScratch = async (prompt: string): Promise<string> => {
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: prompt,
    config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
        outputMimeType: 'image/jpeg'
    }
  });

  const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (base64ImageBytes) {
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  }
  throw new Error("No image generated from scratch");
}