

A powerful AI-powered translation and communication tool designed to bridge language barriers between Myanmar (Burmese) and Chinese speakers. This application leverages advanced AI models and OCR technology to provide accurate translations, pronunciation guides, and text extraction from images.

## 🚀 Features

- **Multi-Model Translation**: Choose between different AI models (Model 1, 2, 3) and Google Translate for the best results.
- **Text Translation**: Instant translation between Burmese, Chinese, and English.
- **OCR & Image Scanning**: Extract text from images or use the camera to scan documents for translation.
- **Smart Web Search**: Integrated web search to provide context-aware results.
- **Pronunciation & Details**: Get pronunciation guides and detailed explanations for translations.
- **History**: Automatically saves your translation history for quick reference.
- **Bilingual UI**: Switch the interface language between English and Chinese.
- **Mobile Support**: Built with Capacitor for easy deployment to Android devices.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide React
- **Backend**: Node.js, Express
- **AI & Cloud Services**:
  - Google Cloud Translate
  - Google Cloud Vision (OCR)
  - Google GenAI (Gemini)
  - OpenAI
- **Mobile**: Capacitor (Android)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (Latest LTS version recommended)
- npm (comes with Node.js)

## ⚙️ Installation

1.  **Clone the repository** (if applicable) or navigate to your project directory.

2.  **Install dependencies**:

    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env` file in the root directory and add your API keys. You can use `.env.local` for local development.
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    # Add other keys as required by services/geminiService.ts and server.js
    ```

## 🏃‍♂️ Running the App

### Development Mode

To start the Vite development server for the frontend:

```bash
npm run dev
```

To start the backend server (if running locally):

```bash
npm start
```

### Production Build

To build the application for production:

```bash
npm run build
```

### Mobile Development (Android)

Sync the project with Android:

```bash
npx cap sync android
```

Open the Android project in Android Studio:

```bash
npx cap open android
```


