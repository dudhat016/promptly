import { GoogleGenAI, Modality, Part } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getPhotographyStyleDetails = (style: string): string => {
    switch (style) {
        case 'Cinematic Lifestyle':
            return `
- **Photography Style:** Cinematic, candid, lifestyle photography.
- **Lighting:** Soft, natural window lighting or gentle morning light. Avoid harsh, direct flash. Create a sense of depth and mood.
- **Composition:** Asymmetrical, rule of thirds. Shallow depth of field, creating a beautiful, creamy bokeh that isolates the subject.
- **Color Grading:** A slightly desaturated, cinematic color grade. Harmonious, muted color palette. Emphasize skin tones naturally.
- **Mood:** Serene, contemplative, authentic, elegant, aspirational. A captured "in-between" moment.
            `;
        case 'Vogue Editorial':
            return `
- **Photography Style:** High-fashion, editorial style, reminiscent of a Vogue magazine spread.
- **Lighting:** Dramatic, high-contrast lighting. Can be a single, hard light source to sculpt features or a large, soft source for a clean look.
- **Composition:** Strong, confident, and intentional posing. Can be centered and powerful, or use dynamic angles. Full-body or three-quarter shots are common.
- **Color Grading:** Can be bold and stylized, or classic black and white. Colors should be rich and impactful.
- **Mood:** Confident, powerful, chic, avant-garde, poised.
            `;
        case 'Golden Hour Portrait':
            return `
- **Photography Style:** Outdoor portraiture during the golden hour (just after sunrise or before sunset).
- **Lighting:** Warm, soft, glowing, directional light. Creates long, soft shadows and beautiful lens flare. Backlighting is common to create a halo effect.
- **Composition:** Focus on the interplay between the subject and the warm light.
- **Color Grading:** Emphasize the warm tones - golds, oranges, and reds. Deepen the shadows to add contrast.
- **Mood:** Romantic, magical, serene, warm, dreamy.
            `;
        case 'Minimalist Scandi':
            return `
- **Photography Style:** Scandinavian-inspired minimalism. Clean, bright, and airy.
- **Lighting:** Bright, diffused, even lighting, simulating a large window on an overcast day. Low contrast and soft shadows.
- **Composition:** Simple, uncluttered backgrounds. Focus on form, texture, and negative space.
- **Color Grading:** A neutral, desaturated color palette with whites, greys, beiges, and subtle pastels.
- **Mood:** Calm, peaceful, clean, effortless, modern.
            `;
        case 'Moody Film Noir':
            return `
- **Photography Style:** Inspired by classic film noir. Dramatic and mysterious.
- **Lighting:** Low-key lighting with deep shadows and sharp highlights (chiaroscuro). Light often comes from a single, controlled source.
- **Composition:** Use of shadows as a key compositional element. Unconventional framing and angles to create tension.
- **Color Grading:** Primarily black and white, or a very desaturated color palette with a cool, blueish or greenish tint.
- **Mood:** Mysterious, dramatic, introspective, suspenseful, timeless.
            `;
        default:
            return '';
    }
};

interface GenerationParams {
    ethnicity: string;
    complexion: string;
    makeupStyle: string;
    hairstyle: string;
    nailStyle: string;
    clothingStyle: string;
    setting: string;
    photographyStyle: string;
    customPrompt: string;
    uploadedImage: string | null; // Base64 string without data URI
}

export async function generateLuxeImage({
    ethnicity,
    complexion,
    makeupStyle,
    hairstyle,
    nailStyle,
    clothingStyle,
    setting,
    photographyStyle,
    customPrompt,
    uploadedImage,
}: GenerationParams): Promise<string> {
    
    const ethnicityPrompt = ethnicity === 'Random' ? 'a randomly selected ethnicity' : ethnicity;

    let complexionInstruction = '';
    if (uploadedImage && complexion === 'Match Reference (if uploaded)') {
        complexionInstruction = `Critically, her skin complexion must closely match the skin tone of the person in the provided reference image. This is a primary requirement.`;
    } else if (complexion !== 'Random' && complexion !== 'Match Reference (if uploaded)') {
        complexionInstruction = `She has a beautiful, flawless '${complexion}' skin tone.`;
    } else {
        complexionInstruction = 'Her skin complexion should be radiant and flawless.';
    }

    const photographyStyleDetails = getPhotographyStyleDetails(photographyStyle);
    
    const basePrompt = `
      **Primary Goal:** Create a hyper-realistic, luxury stock photograph of a high-fashion female model. The final image must be absolutely indistinguishable from a real photograph taken by a world-class professional photographer. This is the most important instruction.

      **Art Direction:**
      ${photographyStyleDetails}
      - **Setting:** The scene is a ${setting}. It should complement the overall mood and style.

      **Model & Styling Details:**
      - **Ethnicity:** She is a beautiful ${ethnicityPrompt} woman.
      - **Complexion:** ${complexionInstruction}
      - **Makeup:** Professional, flawless '${makeupStyle}' makeup that enhances her features and fits the art direction.
      - **Hair:** Chic '${hairstyle}' style.
      - **Nails:** A professional '${nailStyle}' manicure.
      - **Outfit:** She is wearing a '${clothingStyle}'. The fabric and texture should be rendered realistically.

      **Critical Realism Directives:**
      - **Camera & Lens:** Emulate the look of a high-end medium format camera (like a Hasselblad or Phase One) with a prime lens (e.g., 85mm f/1.4). This means exquisite detail, clarity, and a natural, pleasing perspective.
      - **Skin Texture:** This is non-negotiable. The skin must look real. It must have visible, subtle texture, including pores, minimal, natural imperfections, and realistic highlights. Absolutely AVOID the overly smooth, plastic, airbrushed, or "doll-like" skin common in AI generations.
      - **Details:** Pay extreme attention to the fine details: individual strands of hair (including subtle flyaways), the texture of clothing fabric, realistic reflections in the eyes, and the way light interacts with different surfaces.
      - **Avoid Uncanny Valley:** The model's expression, pose, and proportions must be natural and believable. Avoid anything that feels stiff, awkward, or artificial.
    `;

    const customPromptSection = customPrompt 
        ? `
        **Additional User Instructions:**
        - ${customPrompt}
        ` 
        : '';
        
    const parts: Part[] = [];

    if (uploadedImage) {
        parts.push({
            inlineData: {
                data: uploadedImage,
                mimeType: 'image/jpeg',
            },
        });
        parts.push({
            text: `Using the provided image as creative inspiration, generate a new, unique, and photorealistic luxury stock photo. Reimagine the scene with the following specific attributes, do not simply copy the original image:\n\n${basePrompt}${customPromptSection}`
        });
    } else {
        parts.push({
            text: `Generate a new, unique, and photorealistic luxury stock photo based on the following attributes:\n\n${basePrompt}${customPromptSection}`
        });
    }
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    throw new Error("No image was generated in the response.");
}