import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { v2 } from '@google-cloud/translate';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const apiKeyFlash = process.env.API_KEY || process.env.GEMINI_API_KEY;
if (!apiKeyFlash) {
  console.error("❌ FATAL ERROR: Main API Key is missing.");
  process.exit(1);
}

const apiKeyLite = process.env.API_KEY2 || apiKeyFlash; 
const apiKeyPro = process.env.API_KEY3 || apiKeyFlash;  

const aiFlash = new GoogleGenAI({ apiKey: apiKeyFlash });
const aiLite = new GoogleGenAI({ apiKey: apiKeyLite });
const aiFlash2 = new GoogleGenAI({ apiKey: apiKeyPro });

const MODELS = {
  'gemini-2.5-flash': { client: aiFlash, name: "gemini-2.5-flash" },
  'gemini-2.5-flash-lite': { client: aiLite, name: "gemini-2.5-flash-lite" },
  'gemini-2.5-flash-2': { client: aiFlash2, name: "gemini-2.5-flash" },
};

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

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    translation: { type: Type.STRING },
    pronunciation: { type: Type.STRING },
    details: { type: Type.STRING },
  },
  required: ["translation", "pronunciation"],
};

const getPrompt = (text, source, target) => {
  const direction = `${source}->${target}`;
  const baseInstruction = `You are a professional translator. Output specifically in JSON format with fields: 'translation', 'pronunciation', and 'details'.`;

  return `
    ${baseInstruction}
    Task: Translate from ${source} to ${target}.
    Input: "${text}"
  `;
};

app.post('/api/ocr', async (req, res) => {
  try {
    if (!visionClient) return res.status(503).json({ error: "OCR service not configured" });
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "No image data provided" });

    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Image, 'base64');
    const request = { image: { content: buffer } };

    const [result] = await visionClient.textDetection(request);
    const extractedText = result.textAnnotations?.[0]?.description || "";
    
    res.json({ text: extractedText });
  } catch (error) {
    console.error("OCR Error:", error);
    res.status(500).json({ error: "Failed to process image", details: error.message });
  }
});

app.post('/api/ocr-overlay', async (req, res) => {
  try {
    if (!visionClient) return res.status(503).json({ error: "OCR service not configured" });
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "No image data provided" });

    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Image, 'base64');
    
    const request = { image: { content: buffer } };
    const [result] = await visionClient.documentTextDetection(request);
    
    const fullText = result.fullTextAnnotation?.text || "";
    const blocks = [];

    const getUnionBox = (wordBoxes) => {
      if (!wordBoxes || wordBoxes.length === 0) return null;
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      wordBoxes.forEach(box => {
        if (!box) return;
        box.vertices.forEach(v => {
           const x = v.x || 0;
           const y = v.y || 0;
           minX = Math.min(minX, x);
           minY = Math.min(minY, y);
           maxX = Math.max(maxX, x);
           maxY = Math.max(maxY, y);
        });
      });

      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    };

    const pages = result.fullTextAnnotation?.pages || [];
    
    for (const page of pages) {
      for (const block of page.blocks) {
        for (const paragraph of block.paragraphs) {
          
          let currentLineWords = [];
          let currentLineText = "";

          for (const word of paragraph.words) {
            let wordText = "";
            let breakType = null;

            for (const symbol of word.symbols) {
              wordText += symbol.text;
              if (symbol.property?.detectedBreak) {
                 breakType = symbol.property.detectedBreak.type;
              }
            }

            // Accumulate word data
            currentLineWords.push(word.boundingBox);
            currentLineText += wordText;

            // Handle spacing for next word in line
            if (breakType === 'SPACE' || breakType === 'SURE_SPACE') {
                currentLineText += " ";
            }

            // Check if this word ends a line
            if (breakType === 'EOL_SURE_SPACE' || breakType === 'LINE_BREAK' || breakType === 'HYPHEN') {
                const box = getUnionBox(currentLineWords);
                if (box && currentLineText.trim()) {
                   blocks.push({
                     text: currentLineText.trim(), // Remove trailing space
                     box: box
                   });
                }
                // Reset for next line
                currentLineWords = [];
                currentLineText = "";
            }
          }
          
          // Flush any remaining words as a line (if paragraph didn't end with explicit break)
          if (currentLineWords.length > 0) {
             const box = getUnionBox(currentLineWords);
             if (box && currentLineText.trim()) {
                blocks.push({ text: currentLineText.trim(), box: box });
             }
          }
        }
      }
    }

    res.json({ fullText, blocks });
  } catch (error) {
    console.error("OCR Overlay Error:", error);
    res.status(500).json({ error: "Failed to process image overlay", details: error.message });
  }
});

app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLang, targetLang, provider = 'gemini-2.5-flash' } = req.body;

    if (!text) return res.status(400).json({ error: "Text is required" });

    if (provider === 'google') {
      if (!translateClient) return res.status(503).json({ error: "Google Translate not configured." });
      
      const codeMap = { 'Burmese': 'my', 'Chinese': 'zh-CN', 'English': 'en' };
      const targetCode = codeMap[targetLang];
      const [translation] = await translateClient.translate(text, targetCode);

      return res.json({
        translation: translation,
        pronunciation: "N/A (Google Translate)", 
        details: "Translated via Google Cloud API",
      });
    }

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
    res.json(JSON.parse(jsonText));

  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ error: "Translation failed on server" });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});