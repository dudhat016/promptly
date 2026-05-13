import { GoogleGenAI, Modality } from "@google/genai";
import { GenerationOptions, GeneratedImage } from '../types';
import { SCENES, SCENE_PRESETS } from '../constants';

const fileToGenerativePart = (file: File) => {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        return reject(new Error("Failed to read file as base64 string."));
      }
      const base64Data = reader.result.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const generateLifestyleImages = async (
  referenceImage: File,
  options: GenerationOptions
): Promise<GeneratedImage[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const imagePart = await fileToGenerativePart(referenceImage);

    // Find the selected preset and get its scenes
    const preset = SCENE_PRESETS.find(p => p.name === options.scenePreset) || SCENE_PRESETS[0];
    const availableScenes = SCENES.filter(scene => preset.scenes.includes(scene.title));

    // Shuffle the available scenes for variety
    const shuffledScenes = [...availableScenes].sort(() => 0.5 - Math.random());
    const selectedScenes = shuffledScenes.slice(0, options.numberOfImages);

    const generationPromises = selectedScenes.map(async (scene, index) => {
      const hairstylePrompt = options.hairstyle === "As in photo" 
        ? "maintaining the exact same hairstyle as the reference image" 
        : `with ${options.hairstyle.toLowerCase()}`;
        
      const outfitPrompt = options.outfit === "As in photo"
        ? "She is wearing the exact same outfit as in the reference photo, maintaining it consistently across all images."
        : `She is wearing one consistent outfit across all images, styled as a young, vibrant, and chic '${options.outfit}'. All footwear must be stylish and modern boots or heels; no corny or old-lady looking shoes.`;

      const skinPrompt = {
        "Natural & Realistic (with pores)": "The skin texture must be hyper-realistic, showing natural pores and subtle, authentic imperfections, perfectly matching the reference photo's skin tone.",
        "Glossy & Dewy Finish": "Her skin has a glossy, dewy, and moisturized finish with a healthy glow, perfectly matching the reference photo's skin tone.",
        "Soft Matte Finish": "Her skin has a soft matte, velvety finish, perfectly powdered and non-shiny, perfectly matching the reference photo's skin tone.",
        "Sunkissed & Freckled": "She has a sunkissed complexion with a natural scattering of light freckles across her nose and cheeks, perfectly matching the reference photo's skin tone.",
        "Glamorous Flawless (Airbrushed)": "Her skin is airbrushed to glamorous perfection, completely flawless and camera-ready, perfectly matching the reference photo's skin tone.",
      }[options.skin] || "The skin texture should be natural and realistic, perfectly matching the reference photo's skin tone.";

      const bodyShapePrompt = `Her body shape is defined by: Height - ${options.height}, Bust - ${options.bust}, Waist - ${options.waist}, Hips - ${options.hips}. If these are 'As in photo', match the reference image's proportions exactly.`;
      
      const aspectRatioPrompt = options.aspectRatio !== 'As in photo' ? `\nThe final image must have a ${options.aspectRatio.split(' ')[0]} aspect ratio.` : '';

      const enhancerPrompt = options.enhancer ? `\n**User's Custom Enhancements:** ${options.enhancer}` : '';

      const prompt = `Create an ultra-realistic, professional photograph of a perfect 'baddie' style influencer, who must be an **identical twin** to the woman in the reference image. 
**It is absolutely critical to preserve every facial feature, exact skin tone, body shape, and distinguishing marks without any changes.** The aesthetic is glamorous, confident, bold, and chic.
${bodyShapePrompt}
${skinPrompt}
**Scene Description:** She is ${scene.prompt}. 
${outfitPrompt}
She has ${hairstylePrompt}.
The overall location vibe is ${options.location}.${enhancerPrompt}${aspectRatioPrompt}
Ensure all details from the scenery and outfit descriptions are accurately and richly rendered. The final image must have a high-end, editorial quality.`;
      
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

        const firstPart = response.candidates?.[0]?.content?.parts?.[0];
        if (firstPart && firstPart.inlineData) {
            const base64ImageBytes = firstPart.inlineData.data;
            const imageUrl = `data:${firstPart.inlineData.mimeType};base64,${base64ImageBytes}`;
            return {
            id: `${scene.title}-${index}`,
            src: imageUrl,
            prompt: scene.title,
            };
        }
        console.warn(`Image generation failed for scene: ${scene.title}`);
        return null;
      } catch (error) {
         console.error(`Error generating scene "${scene.title}":`, error);
         return null;
      }
    });

    const results = await Promise.all(generationPromises);
    return results.filter((result): result is GeneratedImage => result !== null);
  } catch (error) {
    console.error("Error generating lifestyle images:", error);
    throw new Error("Failed to generate images. Please check your API key and try again.");
  }
};
