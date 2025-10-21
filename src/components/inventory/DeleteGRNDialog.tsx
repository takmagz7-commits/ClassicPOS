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
import { GoodsReceivedNote } from "@/types/inventory";

interface DeleteGRNDialogProps {
  grn: GoodsReceivedNote;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (grnId: string) => void;
}

const DeleteGRNDialog = ({ grn, isOpen, onClose, onConfirm }: DeleteGRNDialogProps) => {
  const handleDelete = () => {
    onConfirm(grn.id);
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the Goods Received Note{" "}
            <span className="font-semibold text-foreground">"{grn.referenceNo}"</span>.
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

export default DeleteGRNDialog;