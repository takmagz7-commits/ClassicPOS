"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCurrency } from "@/context/CurrencyContext"; // Import useCurrency
import { formatCurrency } from "@/lib/utils"; // Import formatCurrency

interface GiftCardInputProps {
  onApplyGiftCard: (code: string, amount: number) => void;
  currentSaleTotal: number;
  appliedGiftCardAmount: number;
}

const GiftCardInput = ({ onApplyGiftCard, currentSaleTotal, appliedGiftCardAmount }: GiftCardInputProps) => {
  const [giftCardCode, setGiftCardCode] = useState<string>("");
  const [amountToApply, setAmountToApply] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { currentCurrency } = useCurrency(); // Use currentCurrency from context

  const handleApply = async () => {
    if (!giftCardCode) {
      toast.error("Please enter a gift card code.");
      return;
    }
    const amount = parseFloat(amountToApply);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount to apply.");
      return;
    }
    if (amount > currentSaleTotal) {
      toast.error(`Cannot apply more than the current sale total (${formatCurrency(currentSaleTotal, currentCurrency)}).`);
      return;
    }

    setIsLoading(true);
    // Simulate API call for gift card validation and application
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay

    if (giftCardCode === "GIFT123") {
      // In a real scenario, you'd check the gift card's actual balance
      // For now, we'll assume it has enough balance.
      onApplyGiftCard(giftCardCode, amount);
      setGiftCardCode("");
      setAmountToApply("");
      toast.success(`${formatCurrency(amount, currentCurrency)} applied from gift card.`);
    } else {
      toast.error("Invalid gift card code or insufficient balance.");
    }
    setIsLoading(false);
  };

  const remainingBalance = currentSaleTotal - appliedGiftCardAmount;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apply Gift Card</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="gift-card-code">Gift Card Code</Label>
          <Input
            id="gift-card-code"
            placeholder="e.g., GIFT123"
            value={giftCardCode}
            onChange={(e) => setGiftCardCode(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div>
          <Label htmlFor="amount-to-apply">Amount to Apply</Label>
          <Input
            id="amount-to-apply"
            type="number"
            step="0.01"
            placeholder={`Max: ${formatCurrency(remainingBalance, currentCurrency)}`}
            value={amountToApply}
            onChange={(e) => setAmountToApply(e.target.value)}
            disabled={isLoading}
            max={remainingBalance}
          />
        </div>
        <Button onClick={handleApply} className="w-full" disabled={isLoading || remainingBalance <= 0}>
          {isLoading ? "Applying..." : "Apply Gift Card"}
        </Button>
        {appliedGiftCardAmount > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Applied: <span className="font-medium">{formatCurrency(appliedGiftCardAmount, currentCurrency)}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default GiftCardInput;