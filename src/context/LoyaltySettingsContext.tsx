"use client";
import { logger } from "@/utils/logger";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { getSetting, setSetting } from "@/services/dbService";

interface LoyaltySettingsContextType {
  isLoyaltyEnabled: boolean;
  toggleLoyaltyEnabled: (enabled: boolean) => void;
  pointsToCurrencyRate: number;
}

const defaultLoyaltySettings = {
  isLoyaltyEnabled: true,
  pointsToCurrencyRate: 100,
};

const LoyaltySettingsContext = createContext<LoyaltySettingsContextType | undefined>(undefined);

export const LoyaltySettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<{ isLoyaltyEnabled: boolean; pointsToCurrencyRate: number }>(defaultLoyaltySettings);

  // Load loyalty settings from database on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const value = await getSetting('loyaltySettings', JSON.stringify(defaultLoyaltySettings));
        setSettings(JSON.parse(value));
      } catch (error) {
        logger.error('Error loading loyalty settings:', error);
        setSettings(defaultLoyaltySettings);
      }
    };
    loadSettings();
  }, []);

  const toggleLoyaltyEnabled = useCallback((enabled: boolean) => {
    setSettings(prev => {
      const updatedSettings = { ...prev, isLoyaltyEnabled: enabled };

      // Save to database
      try {
        setSetting('loyaltySettings', JSON.stringify(updatedSettings));
      } catch (error) {
        logger.error('Error saving loyalty settings:', error);
      }

      return updatedSettings;
    });
  }, []);

  const pointsToCurrencyRate = settings.pointsToCurrencyRate;

  return (
    <LoyaltySettingsContext.Provider value={{ isLoyaltyEnabled: settings.isLoyaltyEnabled, toggleLoyaltyEnabled, pointsToCurrencyRate }}>
      {children}
    </LoyaltySettingsContext.Provider>
  );
};

export const useLoyaltySettings = () => {
  const context = useContext(LoyaltySettingsContext);
  if (context === undefined) {
    throw new Error("useLoyaltySettings must be used within a LoyaltySettingsProvider");
  }
  return context;
};
