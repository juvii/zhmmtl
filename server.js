import express from 'express';
import cors from 'cors';
// FIXED: Use 'Type' for newer @google/genai versions
import { GoogleGenAI, Type } from '@google/genai';
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

// Enable CORS
app.use(cors());

// IMPORTANT: Increase payload limit for file uploads (Base64 strings)
app.use(express.json({ limit: '50mb' }));

// --- CONFIGURATION ---

const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ FATAL ERROR: API Key is missing. Set API_KEY in Zeabur.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: apiKey });
const modelName = "gemini-2.5-flash";

// Schema definition using 'Type'
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    source_content: {
      type: Type.STRING,
      description: "The verbatim text extracted from the image, PDF, or audio file in the original source language. If text input was provided, mirror it here.",
    },
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
      description: "Brief notes on context, tone, or alternate meanings. Must be in ${targetLang}.",
    },
  },
  required: ["source_content", "translation", "pronunciation"],
};

// --- API ROUTES ---

app.post('/api/translate', async (req, res) => {
  try {
    const { text, file, sourceLang, targetLang } = req.body;

    if (!text && !file) {
      return res.status(400).json({ error: "Text or File is required" });
    }

    // Construct the parts for Gemini
    const parts = [];

    // 1. Add File if present (Base64)
    if (file) {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data
        }
      });
    }

    // 2. Add Text if present
    if (text) {
      parts.push({ text: `Source Text: "${text}"` });
    }

    // 3. Add Strict Instructions
    // We remove "professional translator" fluff to prevent it from defaulting to English.
    const promptInstructions = `
      TASK: Perform high-fidelity OCR/Transcription and Translation for Burmese and Chinese Langauges.
      
      LANGUAGES:
      - Source: ${sourceLang}
      - Target: ${targetLang}
      
      STEPS:
      1. [EXTRACTION]: 
         - If an image/PDF is provided: Perform character-by-character OCR. strictly output the ${sourceLang} text found.
         - If audio is provided: Transcribe the speech verbatim in ${sourceLang}.
         - Save this extracted content to the 'source_content' field.
      
      2. [TRANSLATION]: 
         - Translate the 'source_content' into ${targetLang}.
      
      3. [OUTPUT]:
         - Provide pronunciation guide (Pinyin or Romanization).
         - Provide brief context/details in ${targetLang}.
    `;
    
    // Add instructions as a text part at the end
    parts.push({ text: promptInstructions });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { role: 'user', parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
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
