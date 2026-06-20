import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.taskmanager',
  appName: 'Task Manager',
  webDir: 'build',
  backgroundColor: '#0f111a',
  ios: {
    backgroundColor: '#0f111a'
  }
};

export default config;