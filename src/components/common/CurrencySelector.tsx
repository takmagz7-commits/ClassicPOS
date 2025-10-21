"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrency } from "@/context/CurrencyContext";

const CurrencySelector = () => {
  const { currentCurrency, availableCurrencies, setCurrentCurrencyCode } = useCurrency();

  return (
    <Select value={currentCurrency.code} onValueChange={setCurrentCurrencyCode}>
      <SelectTrigger className="w-[100px]">
        <SelectValue placeholder="Currency" />
      </SelectTrigger>
      <SelectContent>
        {availableCurrencies.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            {currency.symbol} {currency.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CurrencySelector;