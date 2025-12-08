import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { v2 } from '@google-cloud/translate';
import path from 'path';
import { fileURLToPath } from 'url';
import { MODELS_CONFIG } from './serverConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Cloud Services (Kept as requested)
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

// Client Cache to avoid re-instantiating on every request
const openaiClients = {};

const getOpenAIClient = (provider) => {
  if (openaiClients[provider]) return openaiClients[provider];

  const modelConfig = MODELS_CONFIG[provider];
  if (!modelConfig || !modelConfig.apiKey) return null;

  const client = new OpenAI({
    apiKey: modelConfig.apiKey,
    baseURL: modelConfig.baseURL,
  });

  openaiClients[provider] = client;
  return client;
};

// Helper to construct OpenAI-compatible messages
const getMessages = (text, source, target) => {
  let systemPrompt = "";

  // Normalize checking
  const is = (lang) => lang && lang.toLowerCase() === lang.toLowerCase();
  const pair = (l1, l2) => (source === l1 && target === l2) || (source === l2 && target === l1);

  if (pair('Burmese', 'Chinese')) {
    // Burmese <-> Chinese: Tailored for Chinese Users
    // Context/Details should be in CHINESE.
    systemPrompt = `You are an expert Burmese-Chinese translator assisting a Chinese user.
    Task: Translate the following text from ${source} to ${target}.
    
    Output Format (JSON):
    {
      "translation": "The direct translation",
      "pronunciation": "Phonetic guide (Pinyin for Chinese, Romanization for Burmese)",
      "details": "Explanation of grammar, tone, politeness levels, and cultural context IN CHINESE (简体中文)"
    }

    Requirements:
    - If translating TO Burmese: Provide Burmese script and Romanization. Explain nuances in Chinese.
    - If translating TO Chinese: Provide Chinese characters and Pinyin. Explain nuances in Chinese.
    - Ensure tone is appropriate for the context inferred.
    `;
  } else if (pair('English', 'Chinese')) {
    // English <-> Chinese: Tailored for English Users
    // Context/Details should be in ENGLISH.
    systemPrompt = `You are an expert Chinese-English translator assisting an English speaker.
    Task: Translate the following text from ${source} to ${target}.
    
    Output Format (JSON):
    {
      "translation": "The direct translation",
      "pronunciation": "Phonetic guide (Pinyin for Chinese, N/A for English)",
      "details": "Explanation of grammar, tone, politeness levels, and cultural context IN ENGLISH"
    }

    Requirements:
    - If translating TO Chinese: Provide Chinese characters and Pinyin. The 'details' field MUST mostly be in English.
    - If translating TO English: Provide natural English. The 'details' field MUST mostly be in English.
    - CRITICAL: Do NOT use Chinese characters in the 'details' or 'pronunciation' fields unless referencing specific words. The explanation itself must be English.
    `;
  } else {
    // Default / Other pairs (e.g., English <-> Burmese)
    // Default to English context
    systemPrompt = `You are a professional translator.
    Task: Translate text from ${source} to ${target}.
    
    Output Format (JSON):
    {
      "translation": "The direct translation",
      "pronunciation": "Phonetic guide if applicable",
      "details": "Brief, helpful context or grammatical notes in English"
    }
    `;
  }

  // Common JSON instructions
  systemPrompt += `\nResponse must be valid JSON only. No markdown formatting.`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Input text: "${text}"` }
  ];
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
            currentLineWords.push(word.boundingBox);
            currentLineText += wordText;
            if (breakType === 'SPACE' || breakType === 'SURE_SPACE') {
              currentLineText += " ";
            }
            if (breakType === 'EOL_SURE_SPACE' || breakType === 'LINE_BREAK' || breakType === 'HYPHEN') {
              const box = getUnionBox(currentLineWords);
              if (box && currentLineText.trim()) {
                blocks.push({ text: currentLineText.trim(), box: box });
              }
              currentLineWords = [];
              currentLineText = "";
            }
          }
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
    // provider is now 'model1', 'model2', 'model3', or 'google'
    const { text, sourceLang, targetLang, provider = 'model1' } = req.body;

    if (!text) return res.status(400).json({ error: "Text is required" });

    // 1. Handle Google Cloud Translation (Legacy Support)
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

    // 2. Handle OpenAI Compatible Models
    const modelConfig = MODELS_CONFIG[provider];
    if (!modelConfig) {
      return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }

    const openai = getOpenAIClient(provider);

    if (!openai) {
      console.error(`❌ Missing API Key for ${provider}`);
      return res.status(500).json({ error: `Server configuration error: Missing API Key for ${provider}` });
    }

    const messages = getMessages(text, sourceLang, targetLang);

    const completion = await openai.chat.completions.create({
      model: modelConfig.modelName,
      messages: messages,
      response_format: { type: "json_object" }, // Ensure JSON mode is on if supported
      temperature: 0.3,
    });

    const jsonText = completion.choices[0].message.content;

    // Parse the JSON string from the LLM
    try {
      const parsed = JSON.parse(jsonText);
      res.json(parsed);
    } catch (parseError) {
      console.error("Failed to parse LLM response:", jsonText);
      // Fallback if LLM returns bad JSON
      res.json({
        translation: jsonText,
        pronunciation: "",
        details: "Raw output (JSON parse failed)",
      });
    }

  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ error: "Translation failed on server", details: error.message });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});