"use client";
import { logger } from "@/utils/logger";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { PrinterSettings } from "@/types/printer";
import { getSetting, setSetting } from "@/services/dbService";

interface PrinterSettingsContextType {
  printerSettings: PrinterSettings;
  updatePrinterSettings: (newSettings: Partial<PrinterSettings>) => void;
}

const defaultPrinterSettings: PrinterSettings = {
  printerName: "Default POS Printer",
  printerType: "thermal",
  connectionType: "usb",
  ipAddress: "",
  port: 9100,
  bluetoothAddress: "",
};

const PrinterSettingsContext = createContext<PrinterSettingsContextType | undefined>(undefined);

export const PrinterSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(defaultPrinterSettings);

  // Load printer settings from database on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const value = await getSetting('printerSettings', JSON.stringify(defaultPrinterSettings));
        setPrinterSettings(JSON.parse(value));
      } catch (error) {
        logger.error('Error loading printer settings:', error);
        setPrinterSettings(defaultPrinterSettings);
      }
    };
    loadSettings();
  }, []);

  const updatePrinterSettings = useCallback((newSettings: Partial<PrinterSettings>) => {
    setPrinterSettings((prevSettings) => {
      const updatedSettings = {
        ...prevSettings,
        ...newSettings,
      };

      // Save to database
      try {
        setSetting('printerSettings', JSON.stringify(updatedSettings));
      } catch (error) {
        logger.error('Error saving printer settings:', error);
      }

      return updatedSettings;
    });
  }, []);

  return (
    <PrinterSettingsContext.Provider value={{ printerSettings, updatePrinterSettings }}>
      {children}
    </PrinterSettingsContext.Provider>
  );
};

export const usePrinterSettings = () => {
  const context = useContext(PrinterSettingsContext);
  if (context === undefined) {
    throw new Error("usePrinterSettings must be used within a PrinterSettingsProvider");
  }
  return context;
};
