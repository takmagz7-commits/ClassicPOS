import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.serenepangolinbeam',
  appName: 'ClassicPOS',
  webDir: 'dist',
  plugins: {
    CapacitorNodeJS: {
      nodeDir: 'nodejs',
      startMode: 'auto'
    }
  }
};

export default config;
