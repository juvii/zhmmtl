/// <reference types="vite/client" />

/**
 * Application Configuration
 */

// INSTRUCTIONS: 
// Replace with your actual deployed server URL (No trailing slash)
const PROD_API_URL = 'https://juvifanyi.site';

// Detects if the app is running in a Capacitor environment (Android/iOS)
// Capacitor apps often serve from 'http://localhost' (Android) or 'capacitor://' (iOS)
const isCapacitor = window.location.protocol === 'file:' || window.location.hostname === 'localhost';

export const getApiUrl = () => {
  // 1. Local Development (npm run dev)
  // Use relative path '' so Vite proxy in vite.config.ts handles it.
  if (import.meta.env.DEV) {
    return '';
  }

  // 2. Mobile App (Android Production Build)
  // The app is built (DEV=false), but running on the phone.
  // We MUST use the full URL to reach the external server.
  if (isCapacitor) {
    return import.meta.env.VITE_API_URL || PROD_API_URL;
  }

  // 3. Web Production (Deployed Website)
  // The app is built (DEV=false) and running on a real domain (e.g., juvi.com).
  // We return '' to use relative paths. This prevents CORS issues and
  // makes the frontend automatically talk to the backend on the same domain.
  return '';
};

export const API_BASE_URL = getApiUrl();