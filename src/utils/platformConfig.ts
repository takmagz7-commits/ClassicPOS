import { Capacitor } from '@capacitor/core';

export const getApiBaseUrl = (): string => {
  if (Capacitor.isNativePlatform()) {
    return 'http://127.0.0.1:3001/api';
  }
  
  return import.meta.env.VITE_API_URL || '/api';
};

export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};
