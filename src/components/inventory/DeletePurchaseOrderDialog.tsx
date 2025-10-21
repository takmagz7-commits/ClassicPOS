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
import { PurchaseOrder } from "@/types/inventory";

interface DeletePurchaseOrderDialogProps {
  order: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orderId: string) => void;
}

const DeletePurchaseOrderDialog = ({ order, isOpen, onClose, onConfirm }: DeletePurchaseOrderDialogProps) => {
  const handleDelete = () => {
    onConfirm(order.id);
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the Purchase Order{" "}
            <span className="font-semibold text-foreground">"{order.referenceNo}"</span>.
            <p className="mt-2 text-yellow-600 dark:text-yellow-400">
              Note: Deleting a purchase order will not reverse any stock changes made by associated Goods Received Notes.
            </p>
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

export default DeletePurchaseOrderDialog;