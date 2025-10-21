"use client";

import React, { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { toast } from "sonner";
import { logger } from "@/utils/logger";

interface BarcodeScannerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

const qrcodeRegionId = "html5qr-code-full-region";

const BarcodeScannerDialog = ({ isOpen, onClose, onScanSuccess }: BarcodeScannerDialogProps) => {
  const html5QrcodeScannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const handleScanSuccess = (decodedText: string) => {
      onScanSuccess(decodedText);
      toast.success(`Scanned: ${decodedText}`);
      onClose(); // Close dialog on successful scan
    };

    const handleScanError = (errorMessage: string) => {
      // console.warn(`Barcode scan error: ${errorMessage}`); // Suppress verbose errors
      // If a critical error occurs during initialization, you might want to close the dialog
      // For example, if camera access is denied.
      if (errorMessage.includes("NotAllowedError") || errorMessage.includes("NotFoundError")) {
        toast.error("Failed to start scanner: Camera access denied or no camera found.");
        onClose();
      }
    };

    if (isOpen) {
      // Create a new scanner instance every time the dialog opens
      const scanner = new Html5QrcodeScanner(
        qrcodeRegionId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          disableFlip: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
        },
        false // verbose
      );
      html5QrcodeScannerRef.current = scanner; // Store the new instance

      // Render the scanner. Errors during rendering are passed to handleScanError.
      scanner.render(handleScanSuccess, handleScanError);
    }

    return () => {
      const currentScanner = html5QrcodeScannerRef.current;
      if (currentScanner) {
        // Use clear() to stop the scanner and clean up resources
        currentScanner.clear().catch((err) => {
          logger.error("Failed to clear html5QrcodeScanner", err);
        });
        html5QrcodeScannerRef.current = null; // Clear the ref so a new instance is created next time
      }
    };
  }, [isOpen, onScanSuccess, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
          <DialogDescription>
            Position the barcode within the scanning area.
          </DialogDescription>
        </DialogHeader>
        <div id={qrcodeRegionId} className="w-full h-[300px] flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
          {/* The scanner will render here */}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScannerDialog;