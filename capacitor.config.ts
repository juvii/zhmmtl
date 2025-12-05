import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.juvis.translate', // unique ID for your app
  appName: "Juvi's Translate",
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  // Ensure we can access the internet
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
