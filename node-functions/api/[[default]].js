import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();

// --- PLATFORM LIMIT WARNING ---
// Platform likely limits body size to ~6MB.
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- CONFIGURATION ---

// 1. Get the API Key
const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ FATAL ERROR: API Key is missing.");
}

// 2. Initialize Gemini Client (Native SDK supports API Key)
const aiFlash = new GoogleGenAI({ apiKey: API_KEY });
// We can reuse the same key for other models or use specific keys if available
const aiLite = new GoogleGenAI({ apiKey: process.env.API_KEY2 || API_KEY });
const aiPro = new GoogleGenAI({ apiKey: process.env.API_KEY3 || API_KEY });

const MODELS = {
  'gemini-2.5-flash': { client: aiFlash, name: "gemini-2.5-flash" },
  'gemini-2.5-flash-lite': { client: aiLite, name: "gemini-2.5-flash-lite" },
  'gemini-2.5-pro': { client: aiPro, name: "gemini-2.5-pro" },
};

// 3. Define REST API Endpoints for Vision & Translate
// We use REST because the Node.js Client Libraries (@google-cloud/vision) 
// are designed for Service Accounts, not API Keys.
const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`;
const TRANSLATE_API_URL = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;

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

// Route: OCR (Using Google Vision REST API)
app.post('/ocr', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "No image data provided" });

    // Clean base64 string
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

    // Construct REST Payload
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image
          },
          features: [
            {
              type: "TEXT_DETECTION"
            }
          ]
        }
      ]
    };

    const response = await fetch(VISION_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Vision API Error:", errorText);
      return res.status(response.status).json({ error: "Upstream Vision API failed" });
    }

    const data = await response.json();
    const extractedText = data.responses?.[0]?.fullTextAnnotation?.text || "";
    
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

    // --- STRATEGY: GOOGLE TRANSLATE (REST API) ---
    if (provider === 'google') {
      const codeMap = { 'Burmese': 'my', 'Chinese': 'zh-CN', 'English': 'en' };
      const targetCode = codeMap[targetLang];

      const response = await fetch(TRANSLATE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          target: targetCode,
          format: 'text'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Translate API Error:", errorText);
        return res.status(response.status).json({ error: "Upstream Translate API failed" });
      }

      const data = await response.json();
      const translation = data.data?.translations?.[0]?.translatedText || "";

      return res.json({
        translation: translation,
        pronunciation: "N/A (Google Translate)", 
        details: "Translated via Google Cloud REST API",
      });
    }

    // --- STRATEGY: GEMINI MODELS (SDK) ---
    const selectedModel = MODELS[provider] || MODELS['gemini-2.5-flash'];
    
    // Safety check for API Key injection
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

export default app;