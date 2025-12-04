import express from 'express';
import cors from 'cors';
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

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---

// Check for API Key
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ FATAL ERROR: API Key is missing. Set API_KEY in Zeabur.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: apiKey });
const modelName = "gemini-2.5-flash";

// Schema definition (Updated to match your request)
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
        // We can keep the system instruction simple as the prompt handles the heavy lifting now
        systemInstruction: "You are a professional translator.",
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from AI");
    }

    // Parse and return
    res.json(JSON.parse(jsonText));

  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ error: "Translation failed on server" });
  }
});

// --- SERVE FRONTEND ---

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle React routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
