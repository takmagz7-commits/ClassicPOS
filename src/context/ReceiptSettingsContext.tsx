"use client";
import { logger } from "@/utils/logger";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { ReceiptSettings } from "@/types/receipt";
import { getSetting, setSetting } from "@/services/dbService";

interface ReceiptSettingsContextType {
  receiptSettings: ReceiptSettings;
  updateReceiptSettings: (newSettings: Partial<ReceiptSettings>) => void;
}

const defaultReceiptSettings: ReceiptSettings = {
  storeName: "ClassicPOS Store",
  storeAddress: "123 Main St, Anytown, USA 12345",
  storePhone: "(555) 123-4567",
  storeWebsite: "www.classicpos.com",
  thankYouMessage: "Thank you for your purchase!",
  logoUrl: "",
  showSku: true,
  showCategory: false,
  showCustomerInfo: true,
  showVatTin: false,
};

const ReceiptSettingsContext = createContext<ReceiptSettingsContextType | undefined>(undefined);

export const ReceiptSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>(defaultReceiptSettings);

  // Load receipt settings from database on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const value = await getSetting('receiptSettings', JSON.stringify(defaultReceiptSettings));
        setReceiptSettings(JSON.parse(value));
      } catch (error) {
        logger.error('Error loading receipt settings:', error);
        setReceiptSettings(defaultReceiptSettings);
      }
    };
    loadSettings();
  }, []);

  const updateReceiptSettings = useCallback((newSettings: Partial<ReceiptSettings>) => {
    setReceiptSettings((prevSettings) => {
      const updatedSettings = {
        ...prevSettings,
        ...newSettings,
      };

      // Save to database
      try {
        setSetting('receiptSettings', JSON.stringify(updatedSettings));
      } catch (error) {
        logger.error('Error saving receipt settings:', error);
      }

      return updatedSettings;
    });
  }, []);

  return (
    <ReceiptSettingsContext.Provider value={{ receiptSettings, updateReceiptSettings }}>
      {children}
    </ReceiptSettingsContext.Provider>
  );
};

export const useReceiptSettings = () => {
  const context = useContext(ReceiptSettingsContext);
  if (context === undefined) {
    throw new Error("useReceiptSettings must be used within a ReceiptSettingsProvider");
  }
  return context;
};
