// server.js
import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const app = express();
const port = 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Initialize Google AI (Server-side only)
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelName = "gemini-2.5-flash";

// Define the schema here (same as your frontend definition)
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

app.post('/api/translate', async (req, res) => {
  const { text, sourceLang, targetLang } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    const prompt = `
      Translate the following text from ${sourceLang} to ${targetLang}.
      Ensure the translation is natural and accurate. 
      For Burmese to Chinese, use Simplified Chinese.
      For Chinese to Burmese, use standard Burmese script.
      Provide the pronunciation guide (Pinyin for Chinese output, Romanization for Burmese output).
      
      Input text: "${text}"
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are a professional translator specializing in Burmese (Myanmar) and Chinese (Mandarin) languages.",
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from AI");
    }

    const data = JSON.parse(jsonText);
    res.json(data);

  } catch (error) {
    console.error("Server Translation Error:", error);
    res.status(500).json({ error: "Translation failed on server" });
  }
});

app.listen(port, () => {
  console.log(`Backend proxy running at http://localhost:${port}`);
});
