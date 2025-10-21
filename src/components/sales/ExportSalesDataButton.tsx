"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Sale } from "@/types/sale";
import { format } from "date-fns";
import { toast } from "sonner";

interface ExportSalesDataButtonProps {
  sales: Sale[];
  filename?: string;
}

const ExportSalesDataButton = ({ sales, filename = "sales_history" }: ExportSalesDataButtonProps) => {
  const handleExport = () => {
    if (sales.length === 0) {
      toast.info("No sales data to export.");
      return;
    }

    // Define CSV headers
    const headers = [
      "Sale ID",
      "Date",
      "Type",
      "Status",
      "Customer Name",
      "Customer ID",
      "Employee Name",
      "Payment Method ID",
      "Subtotal",
      "Discount Percentage",
      "Discount Amount",
      "Loyalty Points Used",
      "Loyalty Points Discount Amount",
      "Tax Rate Applied",
      "Tax Amount",
      "Gift Card Amount Used",
      "Total",
      "Items (Product Name | Quantity | Price | Cost)",
      "Original Sale ID",
    ];

    // Map sales data to CSV rows
    const csvRows = sales.map(sale => {
      const itemsString = sale.items.map(item =>
        `${item.name} | ${item.quantity} | ${item.price.toFixed(2)} | ${item.cost.toFixed(2)}`
      ).join("; ");

      return [
        `"${sale.id}"`,
        `"${format(new Date(sale.date), "yyyy-MM-dd HH:mm:ss")}"`,
        `"${sale.type}"`,
        `"${sale.status}"`,
        `"${sale.customerName || "N/A"}"`,
        `"${sale.customerId || "N/A"}"`,
        `"${sale.employeeName || "N/A"}"`,
        `"${sale.paymentMethodId || "N/A"}"`,
        `"${sale.subtotal.toFixed(2)}"`,
        `"${sale.discountPercentage !== undefined ? sale.discountPercentage.toFixed(2) : "0.00"}"`,
        `"${sale.discountAmount !== undefined ? sale.discountAmount.toFixed(2) : "0.00"}"`,
        `"${sale.loyaltyPointsUsed !== undefined ? sale.loyaltyPointsUsed : "0"}"`,
        `"${sale.loyaltyPointsDiscountAmount !== undefined ? sale.loyaltyPointsDiscountAmount.toFixed(2) : "0.00"}"`,
        `"${sale.taxRateApplied !== undefined ? (sale.taxRateApplied * 100).toFixed(2) : "0.00"}"`,
        `"${sale.tax.toFixed(2)}"`,
        `"${sale.giftCardAmountUsed !== undefined ? sale.giftCardAmountUsed.toFixed(2) : "0.00"}"`,
        `"${sale.total.toFixed(2)}"`,
        `"${itemsString}"`,
        `"${sale.originalSaleId || "N/A"}"`,
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
      toast.success("Sales data exported successfully!");
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

export default ExportSalesDataButton;