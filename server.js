import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';
import { ImageAnnotatorClient } from '@google-cloud/vision';
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

// Enable CORS and JSON parsing
// Increased limit to handle base64 image uploads
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- CONFIGURATION ---

// 1. Check for Gemini API Key
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ FATAL ERROR: API Key is missing. Set API_KEY in Zeabur.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: apiKey });
const modelName = "gemini-2.5-flash";

// 2. Initialize Cloud Vision Client
let visionClient = null;
if (process.env.VISION) {
  try {
    const credentials = JSON.parse(process.env.VISION);
    visionClient = new ImageAnnotatorClient({ credentials });
    console.log("✅ Cloud Vision Client initialized successfully.");
  } catch (error) {
    console.error("❌ Failed to parse VISION environment variable:", error);
  }
} else {
  console.warn("⚠️ VISION environment variable not found. OCR features will be disabled.");
}

// Schema definition
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    translation: {
      type: Type.STRING,
      description: "The translated text in the target language.",
    },
    pronunciation: {
      type: Type.STRING,
      description: "Phonetic pronunciation (Pinyin for Chinese, Romanization for Burmese).",
    },
    details: {
      type: Type.STRING,
      description: "Brief notes on context, tone, or alternate meanings if applicable.",
    },
  },
  required: ["translation", "pronunciation"],
};

// --- API ROUTES ---

// Route: OCR
app.post('/api/ocr', async (req, res) => {
  try {
    if (!visionClient) {
      return res.status(503).json({ error: "OCR service not configured (Missing Credentials)" });
    }

    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Image, 'base64');

    const [result] = await visionClient.textDetection(buffer);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      return res.json({ text: "" });
    }

    // The first annotation is the full text
    const extractedText = detections[0].description;
    res.json({ text: extractedText });

  } catch (error) {
    console.error("OCR Error:", error);
    res.status(500).json({ error: "Failed to process image" });
  }
});

// Route: Translate
app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLang, targetLang } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    // UPDATED PROMPT LOGIC
    const prompt = `
      Translate the following text from ${sourceLang} to ${targetLang}.
      Ensure the translation is natural and accurate. 
      For Burmese to Chinese, use Simplified Chinese.
      For Chinese to Burmese, use standard Burmese script.
      Provide the pronunciation guide (Pinyin for Chinese output, Romanization for Burmese output).
      **details: must be in ${targetLang}**
      
      Input text: "${text}"
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are a professional Burmese-Chinese translator.",
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from AI");
    }

    res.json(JSON.parse(jsonText));

  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ error: "Translation failed on server" });
  }
});

// --- SERVE FRONTEND ---

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
