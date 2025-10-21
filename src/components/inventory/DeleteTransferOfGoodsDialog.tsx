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
import { TransferOfGoods } from "@/types/inventory";

interface DeleteTransferOfGoodsDialogProps {
  transfer: TransferOfGoods;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (transferId: string) => void;
}

const DeleteTransferOfGoodsDialog = ({ transfer, isOpen, onClose, onConfirm }: DeleteTransferOfGoodsDialogProps) => {
  const handleDelete = () => {
    onConfirm(transfer.id);
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the Transfer of Goods record{" "}
            <span className="font-semibold text-foreground">"{transfer.id.substring(0, 8)}"</span>.
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

export default DeleteTransferOfGoodsDialog;