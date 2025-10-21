"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Product } from "@/types/product";
import { toast } from "sonner";
import { useCategories } from "@/context/CategoryContext";
import { format } from "date-fns"; // Fixed: Added missing import for format

interface ExportProductsDataButtonProps {
  products: Product[];
  filename?: string;
}

const ExportProductsDataButton = ({ products, filename = "product_catalog" }: ExportProductsDataButtonProps) => {
  const { getCategoryName } = useCategories();

  const handleExport = () => {
    if (products.length === 0) {
      toast.info("No product data to export.");
      return;
    }

    // Define CSV headers
    const headers = [
      "Product ID",
      "Name",
      "Category",
      "SKU",
      "Retail Price",
      "Cost Price",
      "Wholesale Price",
      "Stock",
      "Track Stock",
      "Available For Sale",
      "Image URL",
    ];

    // Map product data to CSV rows
    const csvRows = products.map(product => {
      return [
        `"${product.id}"`,
        `"${product.name}"`,
        `"${getCategoryName(product.categoryId)}"`,
        `"${product.sku}"`,
        `"${product.price.toFixed(2)}"`,
        `"${product.cost.toFixed(2)}"`,
        `"${product.wholesalePrice.toFixed(2)}"`,
        `"${product.stock}"`,
        `"${product.trackStock ? "Yes" : "No"}"`,
        `"${product.availableForSale ? "Yes" : "No"}"`,
        `"${product.imageUrl || "N/A"}"`,
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
      toast.success("Product data exported successfully!");
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

export default ExportProductsDataButton;