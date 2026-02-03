import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.482b5184ae2047ee9a764a901942b8bc',
  appName: 'FluxoTV',
  webDir: 'dist',
  server: {
    url: 'https://482b5184-ae20-47ee-9a76-4a901942b8bc.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0a0f'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a0f',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP'
    }
  }
};

export default config;
