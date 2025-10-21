"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Supplier } from "@/types/supplier";
import { format } from "date-fns";
import { toast } from "sonner";

interface ExportSuppliersDataButtonProps {
  suppliers: Supplier[];
  filename?: string;
}

const ExportSuppliersDataButton = ({ suppliers, filename = "supplier_list" }: ExportSuppliersDataButtonProps) => {
  const handleExport = () => {
    if (suppliers.length === 0) {
      toast.info("No supplier data to export.");
      return;
    }

    // Define CSV headers
    const headers = [
      "Supplier ID",
      "Name",
      "Contact Person",
      "Email",
      "Phone",
      "Address",
      "VAT Number",
      "TIN Number",
      "Notes",
    ];

    // Map supplier data to CSV rows
    const csvRows = suppliers.map(supplier => {
      return [
        `"${supplier.id}"`,
        `"${supplier.name}"`,
        `"${supplier.contactPerson || "N/A"}"`,
        `"${supplier.email || "N/A"}"`,
        `"${supplier.phone || "N/A"}"`,
        `"${supplier.address || "N/A"}"`,
        `"${supplier.vatNumber || "N/A"}"`,
        `"${supplier.tinNumber || "N/A"}"`,
        `"${supplier.notes || "N/A"}"`,
      ].join(",");
    });

    // Combine headers and rows
    const csvContent = [headers.join(","), ...csvRows].join("\n");

    // Create a Blob and download it
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Supplier data exported successfully!");
    } else {
      toast.error("Your browser does not support downloading files directly.");
    }
  };

  return (
    <Button onClick={handleExport} variant="outline">
      <Download className="mr-2 h-4 w-4" /> Export to CSV
    </Button>
  );
};

export default ExportSuppliersDataButton;