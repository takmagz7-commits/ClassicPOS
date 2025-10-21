"use client";
import { logger } from "@/utils/logger";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { Currency } from "@/types/currency";
import { getSetting, setSetting } from "@/services/dbService";

// Default available currencies
const availableCurrencies: Currency[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
];

interface CurrencyContextType {
  currentCurrency: Currency;
  availableCurrencies: Currency[];
  setCurrentCurrencyCode: (code: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(availableCurrencies[0]);

  // Load selected currency from database on mount
  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const value = await getSetting('selectedCurrencyCode', 'USD');
        const currency = availableCurrencies.find(c => c.code === value) || availableCurrencies[0];
        setCurrentCurrency(currency);
      } catch (error) {
        logger.error('Error loading currency settings:', error);
        setCurrentCurrency(availableCurrencies[0]);
      }
    };
    loadCurrency();
  }, []);

  const setCurrentCurrencyCode = useCallback((code: string) => {
    const newCurrency = availableCurrencies.find(c => c.code === code);
    if (newCurrency) {
      setCurrentCurrency(newCurrency);
      // Save to database
      try {
        setSetting('selectedCurrencyCode', code);
      } catch (error) {
        logger.error('Error saving currency setting:', error);
      }
    }
  }, []);

  return (
    <CurrencyContext.Provider value={{ currentCurrency, availableCurrencies, setCurrentCurrencyCode }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
