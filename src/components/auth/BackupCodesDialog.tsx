"use client";

import React, { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Download } from "lucide-react";

interface BackupCodesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateAndSave: () => Promise<string[]>;
}

const BackupCodesDialog = ({ isOpen, onClose, onGenerateAndSave }: BackupCodesDialogProps) => {
  const [codes, setCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && codes.length === 0) {
      const generate = async () => {
        setIsLoading(true);
        const newCodes = await onGenerateAndSave();
        setCodes(newCodes);
        setIsLoading(false);
      };
      generate();
    }
  }, [isOpen, codes.length, onGenerateAndSave]);

  const handleCopy = () => {
    navigator.clipboard.writeText(codes.join("\n"));
    toast.success("Backup codes copied to clipboard!");
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([codes.join("\n")], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "classicpos-backup-codes.txt";
    document.body.appendChild(element); // Required for Firefox
    element.click();
    document.body.removeChild(element); // Clean up
    toast.success("Backup codes downloaded!");
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Your MFA Backup Codes</AlertDialogTitle>
          <AlertDialogDescription>
            These are one-time codes to use if you lose access to your authenticator app.
            Please save them in a safe place. Each code can only be used once.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-center text-muted-foreground">Generating codes...</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-md font-mono text-sm">
              {codes.map((code, index) => (
                <span key={index} className="truncate">{code}</span>
              ))}
            </div>
          )}
        </div>
        <AlertDialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleCopy} disabled={isLoading || codes.length === 0} className="w-full sm:w-auto">
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <Button variant="outline" onClick={handleDownload} disabled={isLoading || codes.length === 0} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          </div>
          <AlertDialogAction onClick={onClose} disabled={isLoading || codes.length === 0} className="w-full sm:w-auto">
            I've saved my codes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BackupCodesDialog;