import axios from 'axios';
import { auth } from '../lib/firebase';
import { GoogleGenAI, Modality } from '@google/genai';

export type TwinStudioAction = 'change_outfit' | 'change_hair_color' | 'change_outfit_color';

export type TwinStudioGenerationOptions = {
  hairstyle?: string;
  nails?: string;
  outfit?: string;
  skinComplexion?: string;
  action?: TwinStudioAction;
};

type TwinApiErrorData = {
  error?: string;
  retryAfter?: number;
  isQuotaError?: boolean;
};

export class GeminiQuotaError extends Error {
  retryAfterSeconds?: number;
  isQuotaError = true;
  constructor(message: string, opts?: { retryAfterSeconds?: number; cause?: unknown }) {
    super(message);
    this.name = 'GeminiQuotaError';
    this.retryAfterSeconds = opts?.retryAfterSeconds;
    (this as any).cause = opts?.cause;
  }
}

const twinApi = axios.create({
  baseURL: '/api/ai/twin',
});

twinApi.interceptors.request.use(async (config) => {
  const token = await auth.currentUser?.getIdToken?.().catch(() => null);
  if (token) {
    if (!config.headers) {
      config.headers = {} as any;
    }
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

function getApiMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;
  const payload = error.response?.data as TwinApiErrorData | undefined;
  return payload?.error || error.message || fallback;
}

function asQuotaError(error: unknown): GeminiQuotaError | null {
  if (error instanceof GeminiQuotaError) return error;
  if (!axios.isAxiosError(error)) {
    const msg = String((error as any)?.message || '');
    if (/quota|resource_exhausted|retry in/i.test(msg)) {
      const match = msg.match(/retry in ([\d.]+)s/i);
      const retryAfterSeconds = match ? Math.ceil(parseFloat(match[1])) : undefined;
      return new GeminiQuotaError(msg, { retryAfterSeconds });
    }
    return null;
  }

  const payload = error.response?.data as TwinApiErrorData | undefined;
  const message = payload?.error || error.message || 'Quota exceeded.';
  const retryAfterHeader = Number(error.response?.headers?.['retry-after']);
  const retryAfterBody = Number(payload?.retryAfter);
  
  let retryAfterSeconds = Number.isFinite(retryAfterBody) && retryAfterBody > 0
    ? retryAfterBody
    : Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? retryAfterHeader
      : undefined;

  // Fallback: extract from message string (e.g. "retry in 53s")
  if (retryAfterSeconds === undefined) {
    const match = String(message).match(/retry in ([\d.]+)s/i);
    if (match) {
      retryAfterSeconds = Math.ceil(parseFloat(match[1]));
    }
  }

  const isQuota =
    error.response?.status === 429 ||
    payload?.isQuotaError === true ||
    /quota|resource_exhausted|retry in/i.test(String(message).toLowerCase());

  if (!isQuota) return null;
  return new GeminiQuotaError(message, { retryAfterSeconds, cause: error });
}

function buildTwinMasterPrompt(params: {
  prompt: string;
  aspectRatio: string;
  options?: {
    hairstyle?: string;
    nails?: string;
    outfit?: string;
    skinComplexion?: string;
    action?: "change_outfit" | "change_hair_color" | "change_outfit_color";
  };
  matchOriginalFace: boolean;
  matchSkinTone: boolean;
}) {
  const { prompt, aspectRatio, options = {}, matchOriginalFace, matchSkinTone } = params;

  let customizationDirectives = "";
  if (options.action === "change_outfit") {
    customizationDirectives = `
8.  **Targeted Customizations:**
    *   You are performing a targeted edit. The subject's facial identity, pose, and background MUST be preserved perfectly.
    *   Apply ONLY the following change:
    *   **New Outfit:** Change the subject's outfit to something completely new and stylish. Be creative.
    `;
  } else if (options.action === "change_hair_color") {
    customizationDirectives = `
8.  **Targeted Customizations:**
    *   You are performing a targeted edit. The subject's facial identity, pose, and background MUST be preserved perfectly.
    *   Apply ONLY the following change:
    *   **New Hair Color:** Change the subject's hair color to a new, flattering color that is different from the original.
    `;
  } else if (options.action === "change_outfit_color") {
    customizationDirectives = `
8.  **Targeted Customizations:**
    *   You are performing a targeted edit. The subject's facial identity, pose, and background MUST be preserved perfectly.
    *   Apply ONLY the following change:
    *   **New Outfit Color:** Change the color of the subject's current outfit to a new, complementary color. Do not change the style of the outfit, only its color.
    `;
  } else {
    const hasCustomizations =
      (options.hairstyle && options.hairstyle !== "Default") ||
      (options.nails && options.nails !== "Default") ||
      (options.outfit && options.outfit !== "Default") ||
      (options.skinComplexion && options.skinComplexion !== "Default");

    if (hasCustomizations) {
      customizationDirectives = `
8.  **Targeted Customizations:**
    *   You are performing a targeted edit. The subject's facial identity, pose, and background MUST be preserved perfectly.
    *   Apply ONLY the following changes:
    ${(options.outfit && options.outfit !== "Default") ? `*   **New Outfit:** Re-style the subject in: "${options.outfit}".\n` : ""}
    ${(options.hairstyle && options.hairstyle !== "Default") ? `*   **New Hairstyle:** Restyle the subject's hair to: "${options.hairstyle}".\n` : ""}
    ${(options.nails && options.nails !== "Default") ? `*   **Nail Customization:** Apply the following nail style: "${options.nails}".\n` : ""}
    ${(options.skinComplexion && options.skinComplexion !== "Default") ? `*   **Complexion Finish:** Use a professionally achieved **${options.skinComplexion.toLowerCase()} complexion**.\n` : ""}
        `;
    }
  }

  const skinToneDirective = matchSkinTone
    ? `*   **Skin Tone Consistency:** The subject's base skin tone MUST be retained consistently. The lighting will brighten the skin's appearance, but the underlying tone and complexion must be identical to the reference.`
    : `*   **Skin Tone Artistic Freedom:** You may adjust skin tone subtly for lighting and artistic direction, but keep the person clearly identifiable.`;

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

  const finalPrompt = (prompt || "").trim() || "A beautiful, photorealistic studio shot.";

  return `System Instruction: You are an AI art director for a world-class beauty and fashion photoshoot. Your goal is to generate a flawless, hyper-realistic image that is indistinguishable from a photograph shot by a legendary photographer.

Task: Create a new, breathtakingly realistic image of the person from the reference photos, styled according to the following uncompromising directives.

**Core Directives & Priority Order:**

${identityPreservationDirective}

2.  **Luminous High-Key Lighting (ABSOLUTE RULE):**
    *   **Non-Negotiable Brightness:** Every generated image MUST be significantly lighter and brighter than the reference photos.
    *   **Studio Setup:** Employ a sophisticated, multi-point studio lighting setup with softboxes and diffused fill.
    *   **Luminous Skin Effect:** The overall lighting must produce a bright, airy, high-key effect with glowing, professional beauty lighting.

3.  **Camera & Lens Simulation (CRITICAL):**
    *   Simulate a high-end full-frame camera and a professional portrait lens (85mm/135mm), with shallow depth of field.

4.  **Skin, Makeup & Finish:**
    *   Flawless, professional makeup; realistic skin texture with visible pores; avoid plastic/airbrushed look.
    *   No tattoos.

5.  **Composition & Framing:**
    *   Do not crop the head/hair/shoulders.
    *   Maintain a head-and-shoulders or upper-body framing.

6.  **Post-Processing & Final Polish:**
    *   Subtle cinematic color grading; meticulous retouching while preserving realism; sharpen eyes/lashes/lips.

${customizationDirectives}

7.  **User Prompt Adherence:** After satisfying all higher-priority directives, integrate the user's creative vision: "${finalPrompt}".

8.  **Canvas & Format:** Render in a ${aspectRatio} aspect ratio.

Output only the final image. Do not include any text, descriptions, or commentary.`;
}

async function fileToGenerativePart(file: File) {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function generateTwinMagicPrompt(params: {
  description: string;
  apiKey?: string;
  model?: string;
}): Promise<string> {
  const { description, apiKey, model } = params;

  try {
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction =
        "Transform a user's descriptive text into a concise, evocative, and artistic prompt suitable for generating a stunning AI image. Focus on key visual elements like style, lighting, clothing, and mood. Output only the prompt. No explanations.";

      const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash-image',
        contents: `${systemInstruction}\n\nUser Prompt: "${description}"`,
      });
      return response.text || description;
    }

    const { data } = await twinApi.post<{ text?: string }>('/magic-prompt', { prompt: description });
    return (data.text || '').trim();
  } catch (error) {
    const quotaError = asQuotaError(error);
    if (quotaError) throw quotaError;
    throw new Error(getApiMessage(error, 'Failed to generate magic prompt.'));
  }
}

export async function generateTwinImage(params: {
  imageFiles: File[];
  prompt: string;
  aspectRatio: string;
  options?: TwinStudioGenerationOptions;
  matchOriginalFace?: boolean;
  matchSkinTone?: boolean;
  apiKey?: string;
  model?: string;
}): Promise<string> {
  const {
    imageFiles,
    prompt,
    aspectRatio,
    options,
    matchOriginalFace = true,
    matchSkinTone = true,
    apiKey,
    model,
  } = params;

  if (!Array.isArray(imageFiles) || imageFiles.length === 0) throw new Error('At least one source image is required.');
  try {
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const selectedModel = model || 'gemini-2.5-flash-image'; // Fallback to reference model
      
      const masterPrompt = buildTwinMasterPrompt({
        prompt,
        aspectRatio,
        options,
        matchOriginalFace,
        matchSkinTone,
      });

      const imageParts = await Promise.all(imageFiles.map(fileToGenerativePart));
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: {
          parts: [...imageParts, { text: masterPrompt }] as any,
        },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts as any[]) {
        if (part?.inlineData?.data) return String(part.inlineData.data);
      }
      throw new Error('No image data found in direct response');
    }

    const form = new FormData();
    for (const f of imageFiles) form.append('images', f);
    form.append('prompt', prompt);
    form.append('aspectRatio', aspectRatio);
    form.append('options', JSON.stringify(options ?? {}));
    form.append('matchOriginalFace', String(!!matchOriginalFace));
    form.append('matchSkinTone', String(!!matchSkinTone));

    const { data } = await twinApi.post<{ imageBase64?: string }>('/image', form);
    if (data.imageBase64) return data.imageBase64;
    throw new Error('No image returned from API.');
  } catch (error) {
    const quotaError = asQuotaError(error);
    if (quotaError) throw quotaError;
    throw new Error(getApiMessage(error, 'Failed to generate twin image.'));
  }
}

export type TwinStudioCreation = {
  id: string;
  imageUrl: string;
  prompt?: string;
  aspectRatio?: string;
  options?: Record<string, any>;
  createdAt?: any;
};

export async function listTwinCreations(limit = 24): Promise<TwinStudioCreation[]> {
  const { data } = await twinApi.get<{ items?: TwinStudioCreation[] }>('/creations', {
    params: { limit },
  });
  return Array.isArray(data?.items) ? data.items : [];
}

export async function saveTwinCreation(payload: {
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  options?: Record<string, any>;
}) {
  const { data } = await twinApi.post<{ id?: string }>('/creations', payload);
  return data?.id || null;
}
