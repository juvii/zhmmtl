import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // 1. The unique ID for your app (like a domain name reversed)
  appId: 'com.juvis.translation',
  
  // 2. The name users will see on their home screen
  appName: "Juvi 翻译",
  
  // 3. The directory where Vite builds your website (standard is 'dist')
  webDir: 'dist',
  
  server: {
    // This ensures your app uses https scheme on Android
    androidScheme: 'https'
  },
  
  // 4. Plugins configuration
  plugins: {
    // If we add native camera plugin later, we config it here
  }
};

export default config;
