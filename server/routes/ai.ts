import { Router, json } from "express";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

function getGeminiApiKey(customApiKey?: string): string {
  return customApiKey || process.env.GEMINI_API_KEY || "";
}

// GET /api/ai/gemini/models — List available Gemini models
router.get("/gemini/models", async (req, res) => {
  const apiKey = getGeminiApiKey(req.query.customApiKey as string);
  if (!apiKey) return res.status(400).json({ error: "GEMINI_API_KEY not configured" });

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: errData?.error?.message || "Failed to list models" });
    }
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/gemini/chat — Chat/Generate text using Gemini
router.post("/gemini/chat", json(), async (req, res) => {
  const { messages, systemInstruction, model, customApiKey } = req.body;
  const apiKey = getGeminiApiKey(customApiKey);
  if (!apiKey) return res.status(400).json({ error: "GEMINI_API_KEY not configured" });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const selectedModel = model || process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash-lite";

    const history = Array.isArray(messages) && messages.length > 1
      ? messages.slice(0, -1).map((m: any) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content || "" }],
        }))
      : [];

    const lastMsg = Array.isArray(messages) && messages.length > 0
      ? messages[messages.length - 1]?.content || ""
      : "";

    const chat = ai.chats.create({
      model: selectedModel,
      config: systemInstruction ? { systemInstruction } : undefined,
      history,
    });

    const result = await chat.sendMessage({ message: [{ text: lastMsg }] });
    res.json({ text: result.text || "No response from AI" });
  } catch (err: any) {
    console.error("[AI Route] Gemini Chat Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/openai/models
router.post("/openai/models", json(), async (req, res) => {
  const apiKey = req.body.customApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(400).json({ error: "OpenAI API key missing" });

  try {
    const response = await axios.get("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    res.json({ models: response.data.data });
  } catch (err: any) {
    res.status(err.response?.status || 500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// POST /api/ai/openai/chat
router.post("/openai/chat", json(), async (req, res) => {
  const { messages, systemInstruction, model, customApiKey } = req.body;
  const apiKey = customApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(400).json({ error: "OpenAI API key missing" });

  try {
    const formattedMessages = [
      ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
      ...(messages || []),
    ];

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: model || "gpt-4o-mini",
        messages: formattedMessages,
      },
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    const text = response.data.choices?.[0]?.message?.content || "No response";
    res.json({ text });
  } catch (err: any) {
    res.status(err.response?.status || 500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// POST /api/ai/anthropic/models
router.post("/anthropic/models", json(), async (req, res) => {
  const apiKey = req.body.customApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(400).json({ error: "Anthropic API key missing" });

  try {
    const response = await axios.get("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    res.json({ models: response.data.data });
  } catch (err: any) {
    res.status(err.response?.status || 500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// POST /api/ai/anthropic/chat
router.post("/anthropic/chat", json(), async (req, res) => {
  const { messages, systemInstruction, model, customApiKey } = req.body;
  const apiKey = customApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(400).json({ error: "Anthropic API key missing" });

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: model || "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: systemInstruction,
        messages: messages || [],
      },
      {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      }
    );

    const text = response.data.content?.[0]?.text || "No response";
    res.json({ text });
  } catch (err: any) {
    res.status(err.response?.status || 500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

export default router;
