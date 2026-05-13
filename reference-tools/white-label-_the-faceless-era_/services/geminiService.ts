// FIX: Import 'Modality' to use for responseModalities config.
import { GoogleGenAI, Chat, GenerateContentResponse, Modality } from "@google/genai";
import { PromptTemplate, CaptionOutput } from "../types";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper Functions ---
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

const constructPromptString = (prompt: PromptTemplate): string => {
    const parts = [
        "Create a faceless, luxury lifestyle image in the 'Vogue meets Ebony Incline' style.",
        `Scene: ${prompt.scene}.`,
        `Surface: ${prompt.surface}.`,
        `Main Objects: ${prompt.hero_objects.join(', ')}.`,
        `Hand/Pose Details: ${prompt.hand_pose}.`,
        prompt.ethnicity !== 'Unspecified' ? `Subject Ethnicity: ${prompt.ethnicity}.` : '',
        `Supporting Props: ${prompt.supporting_props.join(', ')}.`,
        `Lighting: ${prompt.lighting}.`,
        `Color Palette: ${prompt.palette.join(', ')}.`,
        `Style Tags: ${prompt.style_tags.join(', ')}.`,
        `Camera: ${prompt.camera.lens} at ${prompt.camera.aperture}, ISO ${prompt.camera.iso}, ${prompt.camera.shutter}, WB ${prompt.camera.wb}. Aim for shallow depth of field, soft bloom, gentle halation, and mild cinematic grain.`,
        prompt.custom_prompt ? `Additional user details: ${prompt.custom_prompt}.` : '',
        "Crucially, do NOT show any identifiable faces. The composition should be artistic, clean, and luxurious."
    ];
    return parts.filter(Boolean).join(' ');
};

// --- API Functions ---

export const generateImage = async (prompt: PromptTemplate): Promise<string[]> => {
    const promptString = constructPromptString(prompt);
    
    try {
        const generationCount = prompt.mode === 'moodboard_set' ? 3 : 1;
        
        const promises = Array.from({ length: generationCount }).map(() => 
            ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: promptString,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: prompt.aspect_ratio === '4:5' ? '3:4' : prompt.aspect_ratio as | "1:1" | "16:9" | "9:16" | "3:4",
                },
            })
        );
        
        const responses = await Promise.all(promises);

        const imageUrls = responses.map(response => {
            if (response.generatedImages && response.generatedImages.length > 0) {
                const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
                return `data:image/jpeg;base64,${base64ImageBytes}`;
            }
            throw new Error("An image generation call failed.");
        });

        if (imageUrls.length > 0) {
            return imageUrls;
        }
        
        throw new Error("No images were generated.");

    } catch (error) {
        console.error("Error generating image(s):", error);
        throw new Error(`Failed to generate images. Details: ${error instanceof Error ? error.message : String(error)}`);
    }
};


export const editImage = async (imagePart: { inlineData: { data: string; mimeType: string; } }, prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [imagePart, { text: prompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No edited image returned.");
    } catch (error) {
        console.error("Error editing image:", error);
        throw error;
    }
};

export const analyzeImage = async (imagePart: { inlineData: { data: string; mimeType: string; } }): Promise<string> => {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    imagePart,
                    { text: "Describe this image in detail, focusing on its aesthetic, mood, and potential for a luxury or minimalist brand. Embody the tone of 'Vogue meets Ebony Incline'." }
                ],
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error analyzing image:", error);
        throw error;
    }
};

export const generateCaption = async (contextText: string): Promise<CaptionOutput> => {
    try {
        const prompt = `
            Based on the following image description, generate a luxe caption, 3 hooks, and 3 CTAs.
            The tone should be confident, soft, wealthy, and feminine, like 'Vogue meets Ebony'.
            Format the output as a markdown list exactly like this:
            - Caption: [Your caption here]
            - Hook 1: [First hook]
            - Hook 2: [Second hook]
            - Hook 3: [Third hook]
            - CTA 1: [First CTA]
            - CTA 2: [Second CTA]
            - CTA 3: [Third CTA]

            Image Description: "${contextText}"
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        
        const text = response.text;
        const lines = text.split('\n').filter(line => line.startsWith('- '));
        
        const output: CaptionOutput = {
            caption: lines[0]?.replace('- Caption: ', '').trim() || "A moment in time.",
            hooks: [
                lines[1]?.replace('- Hook 1: ', '').trim() || "",
                lines[2]?.replace('- Hook 2: ', '').trim() || "",
                lines[3]?.replace('- Hook 3: ', '').trim() || ""
            ].filter(Boolean),
            ctas: [
                lines[4]?.replace('- CTA 1: ', '').trim() || "",
                lines[5]?.replace('- CTA 2: ', '').trim() || "",
                lines[6]?.replace('- CTA 3: ', '').trim() || ""
            ].filter(Boolean),
        };
        
        return output;
    } catch (error) {
        console.error("Error generating caption:", error);
        throw error;
    }
}

export const createChat = (): Chat => {
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `You are Faceless Era — a luxury image & caption generator. 
Your visual style = “Vogue meets Ebony Incline”: soft-life elegance, warm champagne lighting, high-gloss details, faceless compositions, and Black luxury representation.
You provide advice on fashion, luxury aesthetics, content creation, and personal branding with a confident, soft, wealthy, and feminine tone.`,
        },
    });
};
