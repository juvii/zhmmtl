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
    translation: {
      type: Type.STRING,
      description: "The translated text in the target language. If the input is audio, translate the spoken content.",
    },
    pronunciation: {
      type: Type.STRING,
      description: "Phonetic pronunciation (Pinyin for Chinese, Romanization for Burmese).",
    },
    details: {
      type: Type.STRING,
      description: "Brief notes on context, tone, or alternate meanings. For images/audio, describe what was translated.",
    },
  },
  required: ["translation", "pronunciation"],
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

    // 1. Add Text if present
    if (text) {
      parts.push({ text: `Input text to translate: "${text}"` });
    }

    // 2. Add File if present (Base64)
    if (file) {
      // file object should be { mimeType: "image/png", data: "base64..." }
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data
        }
      });
      parts.push({ text: "Translate the content of this file." });
    }

    // 3. Add Instructions
    const promptInstructions = `
      You are a professional translator.
      Translate the input (text, audio, or document) from ${sourceLang} to ${targetLang}.
      
      Requirements:
      1. Ensure the translation is natural and accurate.
      2. For Burmese to Chinese, use Simplified Chinese.
      3. For Chinese to Burmese, use standard Burmese script.
      4. Provide the pronunciation guide (Pinyin for Chinese output, Romanization for Burmese output).
      5. **details field**: Must be in ${targetLang}. Include a brief note about the file content if a file was uploaded.
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

    // FIXED: .text is a property, not a function in @google/genai
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
