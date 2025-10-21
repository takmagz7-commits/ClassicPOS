"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sale } from "@/types/sale";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface SettleCreditSaleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  onConfirmSettle: (saleId: string) => void;
}

const SettleCreditSaleDialog = ({ isOpen, onClose, sale, onConfirmSettle }: SettleCreditSaleDialogProps) => {
  const { currentCurrency } = useCurrency();

  const handleConfirm = () => {
    onConfirmSettle(sale.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settle Credit Sale</DialogTitle>
          <DialogDescription>
            Confirm settlement for Credit Sale ID: <span className="font-semibold">{sale.id.substring(0, 8)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-sm">
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{format(new Date(sale.date), "MMM dd, yyyy HH:mm")}</span>
          </div>
          {sale.customerName && (
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{sale.customerName}</span>
            </div>
          )}
          <Separator />
          <h4 className="font-semibold">Items:</h4>
          {sale.items.map((item) => (
            <div key={item.productId} className="flex justify-between text-muted-foreground">
              <span>{item.quantity}x {item.name}</span>
              <span>{formatCurrency(item.price * item.quantity, currentCurrency)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="font-medium">{formatCurrency(sale.subtotal, currentCurrency)}</span>
          </div>
          {sale.discountPercentage && sale.discountAmount && sale.discountPercentage > 0 && (
            <div className="flex justify-between text-red-600 dark:text-red-400">
              <span>Discount ({sale.discountPercentage}%):</span>
              <span className="font-medium">-{formatCurrency(sale.discountAmount, currentCurrency)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Tax ({(sale.taxRateApplied !== undefined ? sale.taxRateApplied * 100 : 0).toFixed(2)}%):</span>
            <span className="font-medium">{formatCurrency(sale.tax, currentCurrency)}</span>
          </div>
          {sale.giftCardAmountUsed && sale.giftCardAmountUsed > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Gift Card Applied:</span>
              <span className="font-medium">-{formatCurrency(sale.giftCardAmountUsed, currentCurrency)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>TOTAL DUE:</span>
            <span>{formatCurrency(sale.total, currentCurrency)}</span>
          </div>
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-md text-green-800 dark:text-green-200">
            <p className="font-semibold">This action will mark the sale as "Completed".</p>
            <p className="text-sm">Ensure payment has been received before confirming.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm Settlement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettleCreditSaleDialog;