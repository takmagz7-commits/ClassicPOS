"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sale, SaleItem } from "@/types/sale";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useProducts } from "@/context/ProductContext"; // Import useProducts

interface RefundDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  onRefundConfirm: (refundItems: SaleItem[], refundTotal: number) => void;
}

const RefundDialog = ({ isOpen, onClose, sale, onRefundConfirm }: RefundDialogProps) => {
  const { currentCurrency } = useCurrency();
  const { products } = useProducts();
  const [refundQuantities, setRefundQuantities] = useState<{ [productId: string]: number }>({});
  const [refundSubtotal, setRefundSubtotal] = useState<number>(0);
  const [refundTax, setRefundTax] = useState<number>(0);
  const [refundTotal, setRefundTotal] = useState<number>(0);

  // Get the tax rate that was applied to the original sale
  const originalTaxRate = sale.taxRateApplied !== undefined ? sale.taxRateApplied : 0;

  const calculateRefundSummary = useCallback((quantities: { [productId: string]: number }) => {
    let currentSubtotal = 0;
    sale.items.forEach(item => {
      currentSubtotal += item.price * (quantities[item.productId] || 0);
    });

    // Apply original discount percentage to the current subtotal of items being refunded
    const calculatedDiscountAmount = sale.discountPercentage ? currentSubtotal * (sale.discountPercentage / 100) : 0;
    const subtotalAfterDiscount = currentSubtotal - calculatedDiscountAmount;

    // Calculate tax on the subtotal after discount
    const currentTax = subtotalAfterDiscount * originalTaxRate;
    const currentTotal = subtotalAfterDiscount + currentTax;

    setRefundSubtotal(currentSubtotal);
    setRefundTax(currentTax);
    setRefundTotal(currentTotal);
  }, [sale.discountPercentage, sale.items, originalTaxRate]);

  useEffect(() => {
    if (isOpen) {
      // Initialize refund quantities to 0 for all items in the sale
      const initialQuantities: { [productId: string]: number } = {};
      sale.items.forEach(item => {
        initialQuantities[item.productId] = 0;
      });
      setRefundQuantities(initialQuantities);
      calculateRefundSummary(initialQuantities);
    }
  }, [isOpen, sale.items, calculateRefundSummary]);

  const handleQuantityChange = (value: string, productId: string) => {
    const quantity = parseInt(value, 10);
    const originalItem = sale.items.find(item => item.productId === productId);

    if (!originalItem) return;

    if (isNaN(quantity) || quantity < 0) {
      setRefundQuantities(prev => ({ ...prev, [productId]: 0 }));
      calculateRefundSummary({ ...refundQuantities, [productId]: 0 });
      return;
    }

    if (quantity > originalItem.quantity) {
      toast.error(`Cannot refund more than ${originalItem.quantity} of ${originalItem.name}.`);
      setRefundQuantities(prev => ({ ...prev, [productId]: originalItem.quantity }));
      calculateRefundSummary({ ...refundQuantities, [productId]: originalItem.quantity });
      return;
    }

    const newQuantities = { ...refundQuantities, [productId]: quantity };
    setRefundQuantities(newQuantities);
    calculateRefundSummary(newQuantities);
  };

  const handleConfirmRefund = () => {
    const itemsToRefund: SaleItem[] = [];
    let totalRefundAmount = 0;

    for (const productId in refundQuantities) {
      const quantity = refundQuantities[productId];
      if (quantity > 0) {
        const originalItem = sale.items.find(item => item.productId === productId);
        if (originalItem) {
          itemsToRefund.push({ ...originalItem, quantity: quantity });
          totalRefundAmount += originalItem.price * quantity;
        }
      }
    }

    if (itemsToRefund.length === 0) {
      toast.error("Please select at least one item to refund.");
      return;
    }

    onRefundConfirm(itemsToRefund, refundTotal);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process Refund for Sale ID: {sale.id.substring(0, 8)}</DialogTitle>
          <DialogDescription>
            Select the quantity of each item to refund.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="font-semibold">Original Sale Items:</p>
          {sale.items.map((item) => {
            const productInStock = products.find(p => p.id === item.productId);
            return (
              <div key={item.productId} className="flex items-center justify-between gap-2 border-b pb-2 last:border-b-0">
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(item.price, currentCurrency)} | Sold: {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`refund-qty-${item.productId}`} className="sr-only">Refund Quantity</Label>
                  <Input
                    id={`refund-qty-${item.productId}`}
                    type="number"
                    min="0"
                    max={item.quantity}
                    value={refundQuantities[item.productId] || 0}
                    onChange={(e) => handleQuantityChange(e.target.value, item.productId)}
                    className="w-24 text-center"
                  />
                </div>
              </div>
            );
          })}
          <Separator className="my-4" />
          <p className="font-semibold">Refund Summary:</p>
          <div className="flex justify-between text-sm">
            <span>Refund Subtotal:</span>
            <span className="font-medium">-{formatCurrency(refundSubtotal, currentCurrency)}</span>
          </div>
          {sale.discountPercentage && sale.discountPercentage > 0 && (
            <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
              <span>Original Discount ({sale.discountPercentage}%):</span>
              <span className="font-medium">+{formatCurrency(sale.discountAmount || 0, currentCurrency)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span>Refund Tax ({(originalTaxRate * 100).toFixed(2)}%):</span> {/* Display original tax rate */}
            <span className="font-medium">-{formatCurrency(refundTax, currentCurrency)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-lg font-bold">
            <span>Total Refund:</span>
            <span className="text-destructive">-{formatCurrency(refundTotal, currentCurrency)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirmRefund} variant="destructive" disabled={refundTotal <= 0}>
            Confirm Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RefundDialog;