"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ImagePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText: string;
}

const ImagePreviewDialog = ({ isOpen, onClose, imageUrl, altText }: ImagePreviewDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4">
          <DialogTitle className="text-center">{altText}</DialogTitle>
        </DialogHeader>
        <div className="relative flex items-center justify-center bg-black">
          <img
            src={imageUrl}
            alt={altText}
            className="max-w-full max-h-[70vh] object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://placehold.co/600x400/cccccc/000000?text=Image+Not+Found";
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImagePreviewDialog;