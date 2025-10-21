"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { useLoyaltySettings } from "@/context/LoyaltySettingsContext"; // New import

interface LoyaltyPointsInputProps {
  availablePoints: number;
  onApplyPoints: (points: number, equivalentAmount: number) => void;
  currentSaleTotal: number;
  appliedPoints: number;
}

const LoyaltyPointsInput = ({
  availablePoints,
  onApplyPoints,
  currentSaleTotal,
  appliedPoints,
}: LoyaltyPointsInputProps) => {
  const { isLoyaltyEnabled, pointsToCurrencyRate } = useLoyaltySettings(); // Use the new context
  const [pointsToRedeem, setPointsToRedeem] = useState<string>(appliedPoints > 0 ? String(appliedPoints) : "");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { currentCurrency } = useCurrency();

  useEffect(() => {
    if (appliedPoints === 0) {
      setPointsToRedeem("");
    } else if (Number(pointsToRedeem) !== appliedPoints) {
      setPointsToRedeem(String(appliedPoints));
    }
  }, [appliedPoints, pointsToRedeem]);

  const calculateEquivalentAmount = (points: number) => {
    return points / pointsToCurrencyRate;
  };

  const handleApply = async () => {
    const points = parseInt(pointsToRedeem, 10);

    if (isNaN(points) || points <= 0) {
      toast.error("Please enter a valid number of points to redeem.");
      return;
    }

    if (points > availablePoints) {
      toast.error(`You only have ${availablePoints} loyalty points available.`);
      return;
    }

    const equivalentAmount = calculateEquivalentAmount(points);
    if (equivalentAmount > currentSaleTotal) {
      toast.error(`Cannot redeem ${points} points (${formatCurrency(equivalentAmount, currentCurrency)}) as it exceeds the current sale total (${formatCurrency(currentSaleTotal, currentCurrency)}).`);
      return;
    }

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate API call

    onApplyPoints(points, equivalentAmount);
    toast.success(`${points} loyalty points applied, saving ${formatCurrency(equivalentAmount, currentCurrency)}.`);
    setIsLoading(false);
  };

  const handleClear = () => {
    onApplyPoints(0, 0);
    setPointsToRedeem("");
    toast.info("Loyalty points redemption cleared.");
  };

  const redeemedAmount = calculateEquivalentAmount(appliedPoints);

  if (!isLoyaltyEnabled) {
    return (
      <Card className="opacity-50 cursor-not-allowed">
        <CardHeader>
          <CardTitle>Redeem Loyalty Points</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Loyalty program is currently disabled.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redeem Loyalty Points</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Available: <span className="font-medium">{availablePoints} pts</span>
        </p>
        <div>
          <Label htmlFor="points-to-redeem">Points to Redeem</Label>
          <div className="flex gap-2">
            <Input
              id="points-to-redeem"
              type="number"
              step="1"
              min="0"
              max={availablePoints}
              placeholder="e.g., 100"
              value={pointsToRedeem}
              onChange={(e) => setPointsToRedeem(e.target.value)}
              disabled={isLoading || availablePoints === 0}
            />
            <Button onClick={handleApply} disabled={isLoading || availablePoints === 0 || currentSaleTotal <= 0}>
              {isLoading ? "Applying..." : "Apply"}
            </Button>
          </div>
        </div>
        {appliedPoints > 0 && (
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Applied: <span className="font-medium">{appliedPoints} pts</span> (Saving: <span className="font-medium">{formatCurrency(redeemedAmount, currentCurrency)}</span>)
            </p>
            <Button variant="outline" size="sm" onClick={handleClear} disabled={isLoading}>
              Clear
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoyaltyPointsInput;