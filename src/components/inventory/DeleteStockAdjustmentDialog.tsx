"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StockAdjustment } from "@/types/inventory";

interface DeleteStockAdjustmentDialogProps {
  adjustment: StockAdjustment;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (adjustmentId: string) => void;
}

const DeleteStockAdjustmentDialog = ({ adjustment, isOpen, onClose, onConfirm }: DeleteStockAdjustmentDialogProps) => {
  const handleDelete = () => {
    onConfirm(adjustment.id);
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the Stock Adjustment{" "}
            <span className="font-semibold text-foreground">"{adjustment.id.substring(0, 8)}"</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteStockAdjustmentDialog;