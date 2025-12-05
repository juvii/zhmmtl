import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { v2 } from '@google-cloud/translate';
import path from 'path';
import { fileURLToPath } from 'url';

// Note: In Node Functions, environment variables are typically injected 
// via the platform dashboard rather than a .env file, but we keep this 
// for local dev if you run it with 'node --env-file=.env' or similar.
// import dotenv from 'dotenv'; 
// dotenv.config();

// Define paths for ES Modules (standard boilerplate)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- PLATFORM LIMIT WARNING ---
// The Node Functions documentation specifies a 6MB request body limit.
// We keep 50mb here for local compatibility, but the platform will 
// likely reject requests larger than 6MB before they reach this line.
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- CONFIGURATION ---

// 1. Initialize Gemini Clients
// We access env vars directly from process.env which is standard in Node Functions
const apiKeyFlash = process.env.API_KEY || process.env.GEMINI_API_KEY;

// Clients
// Note: We initialize these lazily or globally. In serverless, 
// global scope is preserved between warm invocations.
const aiFlash = new GoogleGenAI({ apiKey: apiKeyFlash });
const aiLite = new GoogleGenAI({ apiKey: process.env.API_KEY2 || apiKeyFlash });
const aiPro = new GoogleGenAI({ apiKey: process.env.API_KEY3 || apiKeyFlash });

const MODELS = {
  'gemini-2.5-flash': { client: aiFlash, name: "gemini-2.5-flash" },
  'gemini-2.5-flash-lite': { client: aiLite, name: "gemini-2.5-flash-lite" },
  'gemini-2.5-pro': { client: aiPro, name: "gemini-2.5-pro" },
};

// 2. Initialize Cloud Vision AND Translation Clients
let visionClient = null;
let translateClient = null;

if (process.env.VISION) {
  try {
    const credentials = JSON.parse(process.env.VISION);
    visionClient = new ImageAnnotatorClient({ credentials });
    translateClient = new v2.Translate({ credentials });
  } catch (error) {
    console.error("❌ Failed to parse VISION environment variable:", error);
  }
}

// Schema definition for Gemini
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    translation: { type: Type.STRING },
    pronunciation: { type: Type.STRING },
    details: { type: Type.STRING },
  },
  required: ["translation", "pronunciation"],
};

// --- PROMPT ENGINEERING ---
const getPrompt = (text, source, target) => {
  const direction = `${source}->${target}`;
  const baseInstruction = `
    You are a professional translator.
    Output specifically in JSON format with fields: 'translation', 'pronunciation', and 'details'.
  `;

  switch (direction) {
    case 'Burmese->Chinese':
      return `
        ${baseInstruction}
        Task: Translate Burmese to Simplified Chinese.
        Context: Expert in Sino-Burmese relations.
        Requirements: Fluent Chinese, Pinyin pronunciation, explain cultural nuances.
        Input: "${text}"
      `;
    case 'Chinese->Burmese':
      return `
        ${baseInstruction}
        Task: Translate Simplified Chinese to Burmese.
        Requirements: Formal Burmese script, Romanization pronunciation, context in Burmese.
        Input: "${text}"
      `;
    case 'English->Chinese':
      return `
        ${baseInstruction}
        Task: Translate English to Simplified Chinese.
        Requirements: Modern Chinese, Pinyin pronunciation, context in English.
        Input: "${text}"
      `;
    case 'Chinese->English':
      return `
        ${baseInstruction}
        Task: Translate Chinese to English.
        Requirements: Natural American English, Pinyin pronunciation, explain idioms.
        Input: "${text}"
      `;
    default:
      return `
        ${baseInstruction}
        Task: Translate from ${source} to ${target}.
        Requirements: Accurate translation, phonetic guide, brief notes.
        Input: "${text}"
      `;
  }
};

// --- API ROUTES ---

// NOTE: We changed paths from '/api/ocr' to '/ocr'.
// Because this file sits in `node-functions/api/`, the platform 
// handles the `/api` prefix part of the URL.

// Route: OCR
app.post('/ocr', async (req, res) => {
  try {
    if (!visionClient) return res.status(503).json({ error: "OCR service not configured" });
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "No image data provided" });

    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Image, 'base64');
    const [result] = await visionClient.textDetection(buffer);
    const extractedText = result.textAnnotations?.[0]?.description || "";
    
    res.json({ text: extractedText });
  } catch (error) {
    console.error("OCR Error:", error);
    res.status(500).json({ error: "Failed to process image" });
  }
});

// Route: Translate
app.post('/translate', async (req, res) => {
  try {
    const { text, sourceLang, targetLang, provider = 'gemini-2.5-flash' } = req.body;

    if (!text) return res.status(400).json({ error: "Text is required" });

    if (provider === 'google') {
      if (!translateClient) {
        return res.status(503).json({ error: "Google Translate not configured." });
      }
      const codeMap = { 'Burmese': 'my', 'Chinese': 'zh-CN', 'English': 'en' };
      const targetCode = codeMap[targetLang];
      const [translation] = await translateClient.translate(text, targetCode);

      return res.json({
        translation: translation,
        pronunciation: "N/A (Google Translate)", 
        details: "Translated via Google Cloud",
      });
    }

    const selectedModel = MODELS[provider] || MODELS['gemini-2.5-flash'];
    // Re-initialize client if apiKey was missing at startup but injected later (rare edge case)
    if (!selectedModel.client.apiKey && process.env.API_KEY) {
        selectedModel.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }

    const prompt = getPrompt(text, sourceLang, targetLang);

    const response = await selectedModel.client.models.generateContent({
      model: selectedModel.name,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");

    res.json(JSON.parse(jsonText));

  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ error: "Translation failed on server" });
  }
});

// --- NO STATIC SERVING ---
// We removed the static file serving because the Pages/Serverless platform
// handles the frontend separately.

// --- NO APP.LISTEN ---
// We export the app instead of listening on a port.
export default app;