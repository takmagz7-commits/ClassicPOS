"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Customer } from "@/types/customer";
import { format } from "date-fns";
import { toast } from "sonner";

interface ExportCustomersDataButtonProps {
  customers: Customer[];
  filename?: string;
}

const ExportCustomersDataButton = ({ customers, filename = "customer_list" }: ExportCustomersDataButtonProps) => {
  const handleExport = () => {
    if (customers.length === 0) {
      toast.info("No customer data to export.");
      return;
    }

    // Define CSV headers
    const headers = [
      "Customer ID",
      "Name",
      "Email",
      "Phone",
      "Address",
      "Loyalty Points",
      "VAT Number",
      "TIN Number",
    ];

    // Map customer data to CSV rows
    const csvRows = customers.map(customer => {
      return [
        `"${customer.id}"`,
        `"${customer.name}"`,
        `"${customer.email}"`,
        `"${customer.phone || "N/A"}"`,
        `"${customer.address || "N/A"}"`,
        `"${customer.loyaltyPoints}"`,
        `"${customer.vatNumber || "N/A"}"`,
        `"${customer.tinNumber || "N/A"}"`,
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
      toast.success("Customer data exported successfully!");
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

export default ExportCustomersDataButton;