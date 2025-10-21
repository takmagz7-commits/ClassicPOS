"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface DiscountInputProps {
  onApplyDiscount: (percentage: number) => void;
  currentDiscountPercentage: number;
  currentSaleSubtotal: number;
}

const DiscountInput = ({ onApplyDiscount, currentDiscountPercentage, currentSaleSubtotal }: DiscountInputProps) => {
  const [discountInput, setDiscountInput] = useState<string>(currentDiscountPercentage > 0 ? String(currentDiscountPercentage) : "");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleApply = async () => {
    const percentage = parseFloat(discountInput);

    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      toast.error("Please enter a valid discount percentage between 0 and 100.");
      return;
    }

    setIsLoading(true);
    // Simulate API call or processing delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    onApplyDiscount(percentage);
    toast.success(`${percentage}% discount applied.`);
    setIsLoading(false);
  };

  const handleClear = () => {
    onApplyDiscount(0);
    setDiscountInput("");
    toast.info("Discount cleared.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apply Discount</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="discount-percentage">Discount Percentage (%)</Label>
          <div className="flex gap-2">
            <Input
              id="discount-percentage"
              type="number"
              step="1"
              min="0"
              max="100"
              placeholder="e.g., 10"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              disabled={isLoading}
            />
            <Button onClick={handleApply} disabled={isLoading || currentSaleSubtotal <= 0}>
              {isLoading ? "Applying..." : "Apply"}
            </Button>
          </div>
        </div>
        {currentDiscountPercentage > 0 && (
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Current Discount: <span className="font-medium">{currentDiscountPercentage}%</span>
            </p>
            <Button variant="outline" size="sm" onClick={handleClear} disabled={isLoading}>
              Clear Discount
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiscountInput;