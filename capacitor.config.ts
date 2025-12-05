import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.juvi.translator', // Change this to your unique bundle ID
  appName: "Juvi 翻译",
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // cleartext: true // Uncomment if your API server is HTTP only (not HTTPS)
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;