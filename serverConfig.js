import dotenv from 'dotenv';
dotenv.config();

/* INSTRUCTIONS:
  1. Add your API keys to your .env file (e.g., MODEL1_API_KEY=sk-..., MODEL1_BASE_URL=https://...)
  2. Edit the 'modelName' below to match the specific model ID for that provider (e.g., 'gpt-4o', 'deepseek-chat', 'llama-3.1').
  3. 'baseURL' allows you to point to different providers (OpenAI, Groq, DeepSeek, LocalAI, etc.).
*/

export const MODELS_CONFIG = {
    'model1': {
        // Example: Fast/Cheap Model (e.g., GPT-4o-mini, Flash equivalent)
        apiKey: process.env.MODEL1_API_KEY || process.env.OPENAI_API_KEY,
        baseURL: process.env.MODEL1_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
        modelName: process.env.MODEL1_NAME || 'gemma-3-27b',
    },
    'model2': {
        // Example: High Intelligence Model (e.g., GPT-4o, Claude 3.5 Sonnet via wrapper)
        apiKey: process.env.MODEL2_API_KEY || process.env.OPENAI_API_KEY,
        baseURL: process.env.MODEL2_BASE_URL || 'https://api.longcat.chat/openai',
        modelName: process.env.MODEL2_NAME || 'LongCat-Flash-Chat',
    },
    'model3': {
        // Example: Alternative Provider (e.g., DeepSeek, Groq, or Local LLM)
        apiKey: process.env.MODEL3_API_KEY || process.env.OPENAI_API_KEY,
        baseURL: process.env.MODEL3_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
        modelName: process.env.MODEL3_NAME || 'qwen3-max',
    }
};
