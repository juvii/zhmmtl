import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { v2 } from '@google-cloud/translate';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config();

// Define paths for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// --- CRITICAL FIX: Enable CORS and High Limits for BOTH JSON and URL-Encoded ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true })); // <--- Added this

// --- CONFIGURATION ---

// 1. Initialize Gemini Clients (Flash, Lite, Pro)

// Default/Flash Key
const apiKeyFlash = process.env.API_KEY || process.env.GEMINI_API_KEY;
if (!apiKeyFlash) {
  console.error("❌ FATAL ERROR: Main API Key is missing.");
  process.exit(1);
}

// Additional Keys
const apiKeyLite = process.env.API_KEY2 || apiKeyFlash; 
const apiKeyPro = process.env.API_KEY3 || apiKeyFlash;  

// Clients
const aiFlash = new GoogleGenAI({ apiKey: apiKeyFlash });
const aiLite = new GoogleGenAI({ apiKey: apiKeyLite });
const aiFlash2 = new GoogleGenAI({ apiKey: apiKeyPro });

// Model Names
const MODELS = {
  'gemini-2.5-flash': { client: aiFlash, name: "gemini-2.5-flash" },
  'gemini-2.5-flash-lite': { client: aiLite, name: "gemini-2.5-flash-lite" },
  'gemini-2.5-flash-2': { client: aiFlash2, name: "gemini-2.5-flash" },
};

// 2. Initialize Cloud Vision AND Translation Clients
let visionClient = null;
let translateClient = null;

if (process.env.VISION) {
  try {
    const credentials = JSON.parse(process.env.VISION);
    visionClient = new ImageAnnotatorClient({ credentials });
    translateClient = new v2.Translate({ credentials });
    console.log("✅ Cloud Services (Vision & Translate) initialized successfully.");
  } catch (error) {
    console.error("❌ Failed to parse VISION environment variable:", error);
  }
} else {
  console.warn("⚠️ VISION environment variable not found. Cloud features disabled.");
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

// --- PROMPT ENGINEERING STRATEGIES ---

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
        Context: You are an expert in Sino-Burmese relations and daily communication.
        Requirements:
        1. Translation: Natural, fluent Simplified Chinese.
        2. Pronunciation: Pinyin for the Chinese translation.
        3. Details: Explain any specific Burmese cultural nuances in Simplified Chinese.
        Input: "${text}"
      `;
    
    case 'Chinese->Burmese':
      return `
        ${baseInstruction}
        Task: Translate Simplified Chinese to Burmese.
        Requirements:
        1. Translation: Standard literary or formal Burmese script unless the input is clearly slang.
        2. Pronunciation: Romanization (transliteration) of the Burmese output.
        3. Details: Provide context in Burmese.
        Input: "${text}"
      `;

    case 'English->Chinese':
      return `
        ${baseInstruction}
        Task: Translate English to Simplified Chinese.
        Context: Professional and accurate translation.
        Requirements:
        1. Translation: Modern Simplified Chinese.
        2. Pronunciation: Pinyin.
        3. Details: Provide context in English.
        Input: "${text}"
      `;

    case 'Chinese->English':
      return `
        ${baseInstruction}
        Task: Translate Chinese to English.
        Requirements:
        1. Translation: Natural American English.
        2. Pronunciation: Pinyin.
        3. Details: Explain any idioms used in English.
        Input: "${text}"
      `;

    default:
      return `
        ${baseInstruction}
        Task: Translate from ${source} to ${target}.
        Requirements:
        1. Translation: Accurate and natural.
        2. Pronunciation: Phonetic guide for the target language.
        3. Details: Brief notes in ${target}.
        Input: "${text}"
      `;
  }
};

// --- API ROUTES ---

// Route: OCR
app.post('/api/ocr', async (req, res) => {
  try {
    if (!visionClient) return res.status(503).json({ error: "OCR service not configured" });
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "No image data provided" });

    // 1. Clean Base64
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Image, 'base64');

    // 2. Construct Explicit Request Object
    // This is safer than passing buffer directly for larger files
    const request = {
      image: {
        content: buffer
      }
    };

    const [result] = await visionClient.textDetection(request);
    
    const extractedText = result.textAnnotations?.[0]?.description || "";
    
    res.json({ text: extractedText });
  } catch (error) {
    console.error("OCR Error Full Details:", error); // Log full object
    res.status(500).json({ error: "Failed to process image", details: error.message });
  }
});

// Route: Translate
app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLang, targetLang, provider = 'gemini-2.5-flash' } = req.body;

    if (!text) return res.status(400).json({ error: "Text is required" });

    // --- STRATEGY: GOOGLE CLOUD TRANSLATE ---
    if (provider === 'google') {
      if (!translateClient) {
        return res.status(503).json({ error: "Google Translate not configured." });
      }

      const codeMap = {
        'Burmese': 'my',
        'Chinese': 'zh-CN',
        'English': 'en'
      };
      
      const targetCode = codeMap[targetLang];
      const [translation] = await translateClient.translate(text, targetCode);

      return res.json({
        translation: translation,
        pronunciation: "N/A (Google Translate)", 
        details: "Translated via Google Cloud API",
      });
    }

    // --- STRATEGY: GEMINI MODELS ---
    
    const selectedModel = MODELS[provider] || MODELS['gemini-2.5-flash'];
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

// --- SERVE FRONTEND ---
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});