import { GoogleGenAI, Modality } from "@google/genai";
import { createHash } from "crypto";
import { Router } from "express";
import axios from "axios";
import multiparty from "multiparty";
import fs from "fs";
import { authMiddleware, type AuthenticatedRequest } from "../middleware/auth.js";
import { initFirebase } from "../lib/firebase.js";

const router = Router();

const queueByApiKey = new Map<string, Promise<void>>();
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash-lite";
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || CHAT_MODEL;
const OPENAI_DEFAULT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const ANTHROPIC_DEFAULT_MODEL = process.env.ANTHROPIC_CHAT_MODEL || "claude-3-5-sonnet-20240620";

function apiKeyHash(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("hex");
}

async function runSerializedByKey<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = queueByApiKey.get(key) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  queueByApiKey.set(key, previous.then(() => current, () => current));
  await previous;

  try {
    return await fn();
  } finally {
    release();
  }
}

function handleAiError(error: any, res: any) {
  const status = error?.status || error?.response?.status;
  const responseData = error?.response?.data;
  const message = responseData?.error?.message || responseData?.error || error?.message || "Internal Neural Engine Failure";
  
  console.error("❌ [Neural Studio] AI Error:", {
    status,
    message,
    data: responseData
  });
  
  // Parse 429 Quota Error (Google, OpenAI, Anthropic use 429)
  if (status === 429 || String(message).includes('RESOURCE_EXHAUSTED')) {
    let waitSeconds = 60;
    try {
      // Try to extract retry time from Google's complex error string
      const match = String(message).match(/retry in ([\d.]+)s/);
      if (match) waitSeconds = Math.ceil(parseFloat(match[1]));
      // OpenAI/Anthropic sometimes provide retry-after headers, but we use a default if not found
    } catch (e) {}

    res.setHeader('Retry-After', String(waitSeconds));
    return res.status(429).json({
      error: `Neural Engine Overloaded: Please retry in ${waitSeconds}s. Your current API tier has reached its capacity.`,
      retryAfter: waitSeconds,
      isQuotaError: true
    });
  }

  // Handle Fetch/Network errors
  if (String(message).toLowerCase().includes('fetch failed')) {
    const causeCode = error?.cause?.code || error?.cause?.errno || error?.code;
    return res.status(503).json({
      error: `AI upstream request failed (network restricted).${causeCode ? ` Cause: ${causeCode}` : ""}`,
      code: "AI_UPSTREAM_FETCH_FAILED"
    });
  }

  // Handle specific provider errors
  if (responseData?.error) {
    return res.status(status || 500).json({ 
      error: typeof responseData.error === 'string' ? responseData.error : (responseData.error.message || "Provider Error"),
      details: responseData.error
    });
  }

  res.status(status || 500).json({ error: message });
}


/**
 * Helper to get Gemini client
 */
function getGeminiApiKey(customKey?: string) {
  const apiKey = customKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  return apiKey;
}

function getGeminiClient(customKey?: string) {
  return new GoogleGenAI({ apiKey: getGeminiApiKey(customKey) });
}

async function getUserAiPrefs(uid: string): Promise<{
  geminiKey?: string;
  geminiTextModel?: string;
  geminiImageModel?: string;
}> {
  const firebase = await initFirebase();
  if (!firebase) return {};

  try {
    const snap = await firebase.db.collection("users").doc(uid).get();
    if (!snap.exists) return {};
    const data = snap.data() || {};
    return {
      geminiKey: data?.aiKeys?.gemini || undefined,
      geminiTextModel: data?.aiModels?.gemini?.text || undefined,
      geminiImageModel: data?.aiModels?.gemini?.image || undefined,
    };
  } catch {
    return {};
  }
}

function asBool(value: any, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return fallback;
}

function safeJsonParse<T>(raw: any): T | null {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
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

/**
 * POST /api/ai/chat
 * Proxies chat requests to Gemini
 */
router.post("/chat", async (req, res) => {
  const { messages, systemInstruction, customApiKey, model } = req.body;

  try {
    const apiKey = getGeminiApiKey(customApiKey);
    const text = await runSerializedByKey(apiKeyHash(apiKey), async () => {
      const ai = new GoogleGenAI({ apiKey });
      const selectedModel = typeof model === 'string' && model.trim() ? model.trim() : CHAT_MODEL;

      // Use the Chat API for multi-turn conversations
      const chat = ai.chats.create({
        model: selectedModel,
        config: {
          systemInstruction: systemInstruction
        },
        history: messages.slice(0, -1).map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage({
        message: [{ text: lastMessage.content }]
      });

      return result.text || "No response from AI";
    });

    res.json({ text });
  } catch (error: any) {
    handleAiError(error, res);
  }
});

/**
 * POST /api/ai/enhance-prompt
 * Proxies prompt enhancement requests
 */
router.post("/enhance-prompt", async (req, res) => {
  const { prompt, customApiKey, model } = req.body;
  const systemInstruction = "Transform a user's descriptive text into a concise, evocative, and artistic prompt suitable for generating a stunning AI image. Focus on key visual elements like style, lighting, clothing, and mood. Output only the prompt. No explanations.";

  try {
    const ai = getGeminiClient(customApiKey);
    const selectedModel = typeof model === 'string' && model.trim() ? model.trim() : TEXT_MODEL;
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: `${systemInstruction}\n\nUser Prompt: "${prompt}"`,
    });

    res.json({ text: response.text || prompt });
  } catch (error: any) {
    handleAiError(error, res);
  }
});

// --- OpenAI (ChatGPT) ---
router.post('/openai/models', async (req, res) => {
  try {
    const { customApiKey } = req.body;
    const apiKey = customApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(400).json({ error: "OPENAI_API_KEY is not configured" });

    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    res.json({ models: response.data?.data || [] });
  } catch (error: any) {
    handleAiError(error, res);
  }
});

router.post('/openai/chat', async (req, res) => {
  const { messages, systemInstruction, customApiKey, model } = req.body;
  try {
    const apiKey = customApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(400).json({ error: "OPENAI_API_KEY is not configured" });
    const selectedModel = (typeof model === 'string' && model.trim()) ? model.trim() : OPENAI_DEFAULT_MODEL;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: selectedModel,
        messages: [
          { role: 'developer', content: systemInstruction || 'You are a helpful assistant.' },
          ...(Array.isArray(messages) ? messages : []).map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          }))
        ],
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        }
      }
    );

    const text = response.data?.choices?.[0]?.message?.content;
    res.json({ text: text || "No response from AI" });
  } catch (error: any) {
    handleAiError(error, res);
  }
});

// --- Anthropic (Claude) ---
router.post('/anthropic/models', async (req, res) => {
  try {
    const { customApiKey } = req.body;
    const apiKey = customApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(400).json({ error: "ANTHROPIC_API_KEY is not configured" });

    const response = await axios.get('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });

    res.json({ models: response.data?.data || [] });
  } catch (error: any) {
    handleAiError(error, res);
  }
});

router.post('/anthropic/chat', async (req, res) => {
  const { messages, systemInstruction, customApiKey, model } = req.body;
  try {
    const apiKey = customApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(400).json({ error: "ANTHROPIC_API_KEY is not configured" });
    const selectedModel = (typeof model === 'string' && model.trim()) ? model.trim() : ANTHROPIC_DEFAULT_MODEL;

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: selectedModel,
        max_tokens: 1024,
        system: systemInstruction || 'You are a helpful assistant.',
        messages: (Array.isArray(messages) ? messages : []).map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
      },
      {
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    const parts = response.data?.content || [];
    const textPart = Array.isArray(parts) ? parts.find((p: any) => p?.type === 'text') : null;
    res.json({ text: textPart?.text || "No response from AI" });
  } catch (error: any) {
    handleAiError(error, res);
  }
});

// --- AI Twin Studio (User-integrated) ---
router.post("/twin/magic-prompt", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  try {
    const prefs = await getUserAiPrefs(req.user!.uid);
    const apiKey = prefs.geminiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return res.status(400).json({ error: "Gemini API key is not configured" });

    const ai = getGeminiClient(apiKey);
    const selectedModel = (prefs.geminiTextModel || TEXT_MODEL).trim();
    const systemInstruction =
      "Transform a user's descriptive text into a concise, evocative, and artistic prompt suitable for generating a stunning AI image. Focus on key visual elements like style, lighting, clothing, and mood. Output only the prompt. No explanations.";

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: `${systemInstruction}\n\nUser Prompt: "${prompt}"`,
    });

    res.json({ text: response.text || prompt });
  } catch (error: any) {
    handleAiError(error, res);
  }
});

router.post("/twin/image", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const form = new multiparty.Form();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message || "Failed to parse form data" });

    const prompt = String(fields?.prompt?.[0] || "").trim();
    const aspectRatio = String(fields?.aspectRatio?.[0] || "9:16").trim();
    const options = safeJsonParse<any>(fields?.options?.[0]) || {};
    const matchOriginalFace = asBool(fields?.matchOriginalFace?.[0], true);
    const matchSkinTone = asBool(fields?.matchSkinTone?.[0], true);

    const requestedModel = String(fields?.model?.[0] || "").trim();

    const imageFiles = (files?.images || files?.imageFiles || []) as any[];
    if (!Array.isArray(imageFiles) || imageFiles.length === 0) {
      return res.status(400).json({ error: "At least one image file is required (field name: images)" });
    }

    try {
      const prefs = await getUserAiPrefs(req.user!.uid);
      const apiKey = prefs.geminiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) return res.status(400).json({ error: "Gemini API key is not configured" });

      let selectedModel = requestedModel || prefs.geminiImageModel || process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
      if (selectedModel.includes("preview-image")) selectedModel = "gemini-2.5-flash-image";

      console.log(`[Neural Studio] Selected Image Model: ${selectedModel}`);

      const masterPrompt = buildTwinMasterPrompt({
        prompt,
        aspectRatio,
        options,
        matchOriginalFace,
        matchSkinTone,
      });

      const contentParts = imageFiles.map((f) => {
        const buffer = fs.readFileSync(f.path);
        return {
          inlineData: {
            mimeType: f.headers?.["content-type"] || f.contentType || "image/jpeg",
            data: buffer.toString("base64"),
          },
        };
      });
      contentParts.push({ text: masterPrompt } as any);

      const apiKeyKey = apiKeyHash(apiKey);
      const base64 = await runSerializedByKey(apiKeyKey, async () => {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: selectedModel,
          contents: {
            parts: contentParts as any,
          },
          config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
          },
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts as any[]) {
          if (part?.inlineData?.data) return String(part.inlineData.data);
        }
        throw new Error("No image data found in response");
      });

      res.json({ imageBase64: base64 });
    } catch (error: any) {
      handleAiError(error, res);
    } finally {
      // Cleanup temp files
      try {
        for (const f of imageFiles) {
          if (f?.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
        }
      } catch {}
    }
  });
});

router.get("/twin/creations", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const limit = Math.min(50, Math.max(1, parseInt(String(req.query?.limit || "24"), 10) || 24));
    const snap = await firebase.db
      .collection("ai_twin_creations")
      .where("userId", "==", req.user!.uid)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ items });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to load creations" });
  }
});

router.post("/twin/creations", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { imageUrl, prompt, aspectRatio, options } = req.body || {};
  if (!imageUrl) return res.status(400).json({ error: "imageUrl is required" });

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const docRef = await firebase.db.collection("ai_twin_creations").add({
      userId: req.user!.uid,
      imageUrl,
      prompt: String(prompt || ""),
      aspectRatio: String(aspectRatio || "9:16"),
      options: options || {},
      createdAt: firebase.admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ id: docRef.id });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to save creation" });
  }
});

export default router;
