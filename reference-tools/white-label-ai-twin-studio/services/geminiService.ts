import { GoogleGenAI, Modality } from "@google/genai";

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        resolve('');
      }
    };
    reader.readAsDataURL(file);
  });
  const base64EncodedData = await base64EncodedDataPromise;
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

export const generateMagicPrompt = async (userInput: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `You are an AI assistant for a photorealistic twin image generator. Your task is to transform a user's descriptive text into a concise, evocative, and artistic prompt suitable for generating a stunning AI twin. The prompt should capture the essence of the user's request, whether it's for a casual look or a magnificent, artistic image. Focus on key visual elements like style, lighting, clothing, and mood. The output should be a single, powerful phrase or short sentence. Do not add any conversational text, explanations, or quotation marks. Only return the prompt.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: userInput,
    config: {
      systemInstruction: systemInstruction,
    }
  });

  return response.text;
};

interface GenerationOptions {
    hairstyle?: string;
    nails?: string;
    outfit?: string;
    skinComplexion?: string;
    action?: 'change_outfit' | 'change_hair_color' | 'change_outfit_color';
}

export const generateTwinImage = async (
    imageFiles: File[], 
    prompt: string, 
    aspectRatio: string, 
    options: GenerationOptions = {},
    matchOriginalFace: boolean = true,
    matchSkinTone: boolean = true
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imageParts = await Promise.all(imageFiles.map(file => fileToGenerativePart(file)));
  
  const finalPrompt = prompt;

  let customizationDirectives = '';
  
  if (options.action === 'change_outfit') {
    customizationDirectives = `
8.  **Targeted Customizations:**
    *   You are performing a targeted edit. The subject's facial identity, pose, and background MUST be preserved perfectly.
    *   Apply ONLY the following change:
    *   **New Outfit:** Change the subject's outfit to something completely new and stylish. Be creative.
    `;
  } else if (options.action === 'change_hair_color') {
    customizationDirectives = `
8.  **Targeted Customizations:**
    *   You are performing a targeted edit. The subject's facial identity, pose, and background MUST be preserved perfectly.
    *   Apply ONLY the following change:
    *   **New Hair Color:** Change the subject's hair color to a new, flattering color that is different from the original.
    `;
  } else if (options.action === 'change_outfit_color') {
     customizationDirectives = `
8.  **Targeted Customizations:**
    *   You are performing a targeted edit. The subject's facial identity, pose, and background MUST be preserved perfectly.
    *   Apply ONLY the following change:
    *   **New Outfit Color:** Change the color of the subject's current outfit to a new, complementary color. Do not change the style of the outfit, only its color.
    `;
  } else {
    const hasCustomizations = (options.hairstyle && options.hairstyle !== 'Default') ||
                              (options.nails && options.nails !== 'Default') ||
                              (options.outfit && options.outfit !== 'Default');

    if (hasCustomizations) {
        customizationDirectives = `
8.  **Targeted Customizations:**
    *   You are performing a targeted edit. The subject's facial identity, pose, and background MUST be preserved perfectly.
    *   Apply ONLY the following changes:
    ${(options.outfit && options.outfit !== 'Default') ? `*   **New Outfit:** Re-style the subject in: "${options.outfit}".\n` : ''}
    ${(options.hairstyle && options.hairstyle !== 'Default') ? `*   **New Hairstyle:** Restyle the subject's hair to: "${options.hairstyle}".\n` : ''}
    ${(options.nails && options.nails !== 'Default') ? `*   **Nail Customization:** Apply the following nail style: "${options.nails}".\n` : ''}
        `;
    }
  }
  
  const skinToneDirective = matchSkinTone
    ? `*   **Skin Tone Consistency:** The subject's base skin tone MUST be retained consistently. The lighting will brighten the skin's appearance, but the underlying tone and complexion must be identical to the reference.`
    : `*   **Skin Tone Artistic Freedom:** The subject's skin tone should be realistic and flattering, while being visibly lighter than the reference. You have artistic freedom to adjust it from the reference photo to better suit the overall mood and lighting of the image.`;


  const identityPreservationDirective = matchOriginalFace 
    ? `1.  **Identical Twin Replication (ABSOLUTE, NON-NEGOTIABLE PRIORITY):**
    *   **The Same Person, Identical Twin Standard:** The primary, unbreakable rule is to generate a new photograph of the **exact same individual** from the reference photos. The result must be an identical twin, indistinguishable from the source. This is not an artistic interpretation; it is a technical, photorealistic replication of identity.
    *   **Uncompromising Facial Structure Lock:** You MUST perform a deep forensic analysis of the reference photos to lock in all facial markers. The generated face's proportions, bone structure, and unique identifiers must be a pixel-perfect match.
        *   **Zero Deviation Mandate:** The variance in key facial landmarks (distance between eyes, nose bridge width, lip curvature, jawline angle, cheekbone prominence) MUST be less than 1%. The goal is zero deviation. Treat this as a facial recognition identity verification; the generated image must pass.
        *   **No Morph Drift:** Apply a high-weight identity preservation layer. Prevent ANY morphing or feature drift from the source identity. The generated face must be a direct, 1:1 mapping of the reference face.
    *   **100% Feature Integrity:** Replicate all facial features with absolute accuracy:
        *   **Eyes:** Exact shape, size, color, spacing, and eyelid crease.
        *   **Nose:** Exact shape, width, length, and nostril shape.
        *   **Lips:** Exact curvature, thickness, and unique cupid's bow shape.
        *   **Hairline & Eyebrows:** Exact shape and position.
    ${skinToneDirective}`
    : `1.  **High-Fidelity Likeness (HIGHEST PRIORITY):**
    *   **The Same Person:** This is the most critical rule. The goal is to create a new photograph of the **exact same individual** shown in the reference photos, not a 'twin' or a 'look-alike'. The identity must be preserved without any deviation.
    *   **Strong Likeness:** You MUST perform a deep-analysis to ensure the generated face is a very strong match to the person in the reference photos. All facial features—eyes, nose, mouth, chin, jawline—their precise placement, structure, and shape must be closely replicated.
    ${skinToneDirective}`;
    
  const skinComplexionDirective = (options.skinComplexion && options.skinComplexion !== 'Default')
    ? `*   **Complexion:** The skin must have a specific, professionally-achieved finish: a **${options.skinComplexion.toLowerCase()} complexion**.`
    : '';

  const masterPrompt = `System Instruction: You are an AI art director for a world-class beauty and fashion photoshoot. Your goal is to generate a flawless, hyper-realistic image that is indistinguishable from a photograph shot by a legendary photographer.

Task: Create a new, breathtakingly realistic image of the person from the reference photos, styled according to the following uncompromising directives.

**Core Directives & Priority Order:**

${identityPreservationDirective}

2.  **Luminous High-Key Lighting (ABSOLUTE RULE):**
    *   **Non-Negotiable Brightness:** Every generated image, without exception, MUST be significantly lighter and brighter than the reference photos.
    *   **Studio Setup:** Employ a sophisticated, multi-point studio lighting setup.
    *   **Key Light:** A large softbox to create soft, flattering shadows.
    *   **Fill Light:** A diffused fill light to lift shadows, ensuring a bright, even complexion.
    *   **Hair Light:** A subtle rim light for separation and hair sheen.
    *   **Luminous Skin Effect:** The overall lighting must produce a bright, airy, high-key effect. The subject's skin must appear luminous and glowing, as if professionally lit for a high-end beauty campaign. This is a primary aesthetic goal.

3.  **Camera & Lens Simulation (CRITICAL):**
    *   **Camera:** Simulate a high-end full-frame DSLR or mirrorless camera (e.g., Canon EOS R5, Sony A7R IV).
    *   **Lens:** Use a professional 85mm f/1.4 or 135mm f/1.8 lens.
    *   **Aperture:** The aperture must be set wide (around f/1.8 to f/2.8) to create a shallow depth of field. This results in a tack-sharp subject and a beautifully blurred, non-distracting background.

4.  **Skin, Makeup & Finish:**
    *   **Makeup:** The subject must have flawless, professional makeup application, including perfectly blended foundation, subtle contouring, and a soft, natural glow on the high points of the face.
    ${skinComplexionDirective}
    *   **Finish:** Skin should have a flawless, professional, satin finish. Avoid any overly glossy or "oily" appearance.
    *   **Texture:** Skin must be hyper-realistic, not airbrushed. Show natural skin texture with visible pores for a raw, high-resolution photo look.

5.  **Styling & Appearance:**
    *   **Perfect Hair:** Hair must be impeccably styled, with every strand perfectly defined and in place. It should look healthy, glossy, and immaculate. No frizz or flyaways.
    *   **No Tattoos:** The subject must have clear skin, completely free of any tattoos.

6.  **Composition & Framing:**
    *   **No Cropping:** The entire head, hair, and shoulders of the subject must be fully visible and properly framed. Do not crop or cut off any part of the subject's head, hair, or shoulders.
    *   **Focus:** Maintain a head-and-shoulders or upper-body framing.

7.  **Post-Processing & Final Polish:**
    *   **Color Grading:** Apply subtle, professional-grade color grading to achieve a rich, cohesive, and cinematic color palette.
    *   **Retouching:** Perform meticulous blemish removal while preserving 100% of the natural skin texture.
    *   **Sharpening:** Apply precise sharpening to key features like the eyes, eyelashes, and lips to make them pop.

${customizationDirectives}

9.  **User Prompt Adherence:** After satisfying all higher-priority directives, seamlessly integrate the user's creative vision: "${finalPrompt}".

10. **Canvas & Format:** The final image must be rendered in a ${aspectRatio} aspect ratio.

Output only the final image. Do not include any text, descriptions, or commentary.`;

  const textPart = { text: masterPrompt };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [...imageParts, textPart],
    },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }

  throw new Error("No image data found in the response from Gemini API.");
};
