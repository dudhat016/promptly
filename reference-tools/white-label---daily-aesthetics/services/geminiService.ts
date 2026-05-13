import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Analyzes an image and returns a detailed character profile.
 * @param base64Image The base64 encoded string of the image.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to a detailed text description of the person.
 */
export async function analyzeImage(base64Image: string, mimeType: string): Promise<string> {
  try {
    const prompt = `Perform a forensic-level biometric analysis of the person in the reference image to create a "Digital Twin Identity Profile."
    
    **OBJECTIVE: IDENTITY PRESERVATION**
    Your goal is to describe this person so precisely that a generative model can reconstruct their face EXACTLY in a different setting.
    
    **1. BIOMETRIC FACIAL STRUCTURE (CRITICAL - DO NOT ALTER):**
    - **Face Shape:** Exact contours (e.g., high cheekbones, square jaw, soft chin).
    - **Eye Details:** Precise shape (almond, round, hooded), spacing, canthal tilt.
    - **Nose Geometry:** Bridge width, tip shape (upturned, bulbous, flat), and nostril flare.
    - **Lip Morphology:** Cupid's bow shape, bottom lip fullness vs top lip, philtrum definition.
    
    **2. SKIN TONE BASE:**
    - **Skin Tone:** Exact underlying shade (e.g., 'Cool espresso', 'Golden olive', 'Pale ivory with pink undertones').
    
    **3. DISTINCTIVE FEATURES:**
    - Note any moles, freckles, hairline shape, or brow arch that defines their look.
    
    **4. PHYSIQUE:**
    - Estimated body type and build to ensure consistency in full-body shots.
    
    Output a dense, factual paragraph acting as a blueprint for a clone.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
    });

    return response.text || "";
  } catch (error) {
    console.error("Error analyzing image with Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to analyze image with AI: ${error.message}`);
    }
    throw new Error("An unknown error occurred while analyzing the image.");
  }
}

interface EditOptions {
    expression?: string;
    hairStyle?: string;
    aspectRatio?: string;
    removeBackground?: boolean;
    makeupLook?: string;
    skinTexture?: string;
    eyeColor?: string;
}

/**
 * A helper function to call the Gemini API for image editing.
 */
export async function editImage(
  base64Image: string,
  mimeType: string,
  prompt: string,
  characterProfile: string,
  options: EditOptions = {}
): Promise<string | null> {
  try {
    const { expression, hairStyle, aspectRatio, removeBackground, makeupLook, skinTexture, eyeColor } = options;

    const technicalDirectives = `
    **TECHNICAL SPECS:**
    - **Aesthetic:** Daily Aesthetics / High-End Influencer / Vogue / Luxury.
    - **Quality:** 8K, Photorealistic, Hyper-detailed, Ray-traced lighting.
    - **Camera:** Canon R5 or Sony A7R IV style depth of field.
    ${aspectRatio ? `- **Aspect Ratio:** The composition must fit a **${aspectRatio}** frame.` : ''}
    `;

    let detailedPrompt = `Create a photorealistic "Digital Twin" image.
    
    ${technicalDirectives}

    **IDENTITY CLONING DIRECTIVE (HIGHEST PRIORITY):**
    - You are NOT creating a random person. You are photographing the SPECIFIC PERSON described in the profile below.
    - **FACE STRUCTURE:** The facial features (bone structure, nose shape, eye shape, lip shape, jawline) MUST MATCH the biometric profile exactly. It must be an IDENTICAL TWIN of the reference.
    - **IDENTITY CHECK:** If the output does not look like the identical twin of the reference description, the image is a failure. Do not generate a generic pretty face; generate THIS specific face.
    
    ---
    **BIOMETRIC IDENTITY PROFILE (FIXED):**
    ${characterProfile}
    ---

    **STYLING (APPLY ON TOP OF IDENTITY):**
    - **Hair:** ${hairStyle ? `Subject must have **${hairStyle}**` : 'Subject must have **Straight, sleek, polished**'} hair.
    - **Makeup:** Apply **${makeupLook || 'Soft Glam'}** style makeup.
    - **Skin Finish:** Skin must have a **${skinTexture || 'Glass Skin (Dewy)'}** texture. It must look expensive, hydrated, and flawless.
    - **Eyes:** Subject is wearing **${eyeColor || 'Natural'}** colored contacts (if different from natural). Preserve the *shape* of the eye exactly, only change the iris color if requested.
    - **Expression:** ${expression ? `Subject must show a "${expression}" expression.` : 'Facial expression must match the scene naturally (confident/chic/relaxed).'}
    
    **SCENE:**
    ${removeBackground 
        ? "Background: PURE WHITE STUDIO BACKDROP. No shadows, no props, just the subject isolated for e-commerce/profile usage." 
        : `Scene Context: "${prompt}". Ensure the lighting and shadows on the subject match this environment perfectly.`
    }
    `;
    
    detailedPrompt += `
    **ZERO TOLERANCE FOR BLOOPERS:**
    - **Hands:** If hands are visible, they must have exactly 5 fingers, natural joints, and perfect manicures (matching the luxury aesthetic). No claw-hands.
    - **Limbs:** No extra legs or arms. Anatomy must be perfect.
    - **Eyes:** Both eyes must be symmetrical (unless winking) and looking at the camera or intended target naturally.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: mimeType,
            },
          },
          {
            text: detailedPrompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
        return part.inlineData.data;
      }
    }
    return null;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to edit image with AI: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI model.");
  }
}

export async function applyArtisticStyle(
  base64Image: string,
  mimeType: string,
  style: string
): Promise<string | null> {
  try {
    const detailedPrompt = `Apply the artistic style of "${style}" to the provided image.
    CRITICAL: Recreate the image matching the chosen style. Preserve subject matter.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: mimeType,
            },
          },
          {
            text: detailedPrompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
        return part.inlineData.data;
      }
    }
    return null;

  } catch (error) {
    console.error(`Error applying style "${style}" with Gemini API:`, error);
    if (error instanceof Error) {
        throw new Error(`Failed to apply style with AI: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI model.");
  }
}