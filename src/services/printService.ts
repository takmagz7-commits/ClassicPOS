"use client";

import { Sale } from "@/types/sale";
import { Customer } from "@/types/customer";
import { ReceiptSettings } from "@/types/receipt";
import { PrinterSettings } from "@/types/printer";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { format } from "date-fns";

/**
 * Generates a printable receipt HTML for window.print()
 */
const generateReceiptHTML = (
  sale: Sale,
  customer: Customer | undefined,
  receiptSettings: ReceiptSettings,
  _printerSettings: PrinterSettings
): string => {
  const receiptDate = format(new Date(sale.date), "PPpp");
  const fontSize = 12;
  const paperWidth = 80;
  
  const itemsHTML = sale.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px 4px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
      <td style="padding: 8px 4px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.quantity}</td>
      <td style="padding: 8px 4px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `
    )
    .join("");

  const discountHTML = sale.discountAmount
    ? `<tr><td colspan="2" style="padding: 4px;">Discount:</td><td style="text-align: right; padding: 4px;">-${sale.discountAmount.toFixed(2)}</td></tr>`
    : "";

  const loyaltyHTML = sale.loyaltyPointsUsed
    ? `<tr><td colspan="2" style="padding: 4px;">Loyalty Discount:</td><td style="text-align: right; padding: 4px;">-${(sale.loyaltyPointsUsed / 100).toFixed(2)}</td></tr>`
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Receipt #${sale.id}</title>
      <style>
        @media print {
          body { margin: 0; padding: 20px; }
          @page { margin: 0; }
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: ${fontSize}px;
          max-width: ${paperWidth}mm;
          margin: 0 auto;
          padding: 10px;
        }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .logo { font-size: 24px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .totals { border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
        .footer { text-align: center; margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        ${receiptSettings.logoUrl ? `<img src="${receiptSettings.logoUrl}" alt="Logo" style="max-width: 150px; height: auto;"/>` : ""}
        <div class="logo">${receiptSettings.storeName || "ClassicPOS"}</div>
        <div>${receiptSettings.storeAddress || ""}</div>
        <div>${receiptSettings.storePhone || ""} | ${receiptSettings.storeWebsite || ""}</div>
      </div>
      
      <div>
        <strong>Receipt #${sale.id}</strong><br/>
        Date: ${receiptDate}<br/>
        ${customer && receiptSettings.showCustomerInfo ? `Customer: ${customer.name}<br/>` : ""}
        ${customer?.email && receiptSettings.showCustomerInfo ? `Email: ${customer.email}<br/>` : ""}
        ${sale.employeeName ? `Cashier: ${sale.employeeName}<br/>` : ""}
        ${sale.paymentMethodId ? `Payment: ${sale.paymentMethodId}<br/>` : ""}
      </div>
      
      <table>
        <thead>
          <tr style="border-bottom: 2px solid #000;">
            <th style="padding: 8px 4px; text-align: left;">Item</th>
            <th style="padding: 8px 4px; text-align: right;">Qty</th>
            <th style="padding: 8px 4px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
      
      <div class="totals">
        <table>
          <tr><td colspan="2">Subtotal:</td><td style="text-align: right;">${sale.subtotal.toFixed(2)}</td></tr>
          ${discountHTML}
          ${loyaltyHTML}
          <tr><td colspan="2">Tax:</td><td style="text-align: right;">${sale.tax.toFixed(2)}</td></tr>
          <tr style="font-weight: bold; font-size: 1.2em;"><td colspan="2">TOTAL:</td><td style="text-align: right;">${sale.total.toFixed(2)}</td></tr>
        </table>
      </div>
      
      ${receiptSettings.thankYouMessage ? `<div class="footer">${receiptSettings.thankYouMessage}</div>` : ""}
    </body>
    </html>
  `;
};

/**
 * Generates a PDF receipt as fallback
 */
const generateReceiptPDF = (
  sale: Sale,
  customer: Customer | undefined,
  receiptSettings: ReceiptSettings
): jsPDF => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let yPos = 20;

  doc.setFontSize(18);
  doc.text(receiptSettings.storeName || "ClassicPOS", 105, yPos, { align: "center" });
  yPos += 10;

  doc.setFontSize(10);
  if (receiptSettings.storeAddress) {
    doc.text(receiptSettings.storeAddress, 105, yPos, { align: "center" });
    yPos += 6;
  }
  if (receiptSettings.storePhone || receiptSettings.storeWebsite) {
    doc.text(`${receiptSettings.storePhone || ""} | ${receiptSettings.storeWebsite || ""}`, 105, yPos, { align: "center" });
    yPos += 6;
  }

  yPos += 10;
  doc.setFontSize(12);
  doc.text(`Receipt #${sale.id}`, 20, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.text(`Date: ${format(new Date(sale.date), "PPpp")}`, 20, yPos);
  yPos += 6;
  if (customer && receiptSettings.showCustomerInfo) {
    doc.text(`Customer: ${customer.name}`, 20, yPos);
    yPos += 6;
  }
  if (sale.paymentMethodId) {
    doc.text(`Payment: ${sale.paymentMethodId}`, 20, yPos);
    yPos += 6;
  }
  yPos += 4;

  doc.text("Item", 20, yPos);
  doc.text("Qty", 120, yPos, { align: "right" });
  doc.text("Amount", 190, yPos, { align: "right" });
  yPos += 6;
  doc.line(20, yPos, 190, yPos);
  yPos += 6;

  sale.items.forEach((item) => {
    doc.text(item.name, 20, yPos);
    doc.text(item.quantity.toString(), 120, yPos, { align: "right" });
    doc.text((item.price * item.quantity).toFixed(2), 190, yPos, { align: "right" });
    yPos += 6;
  });

  yPos += 4;
  doc.line(20, yPos, 190, yPos);
  yPos += 6;

  doc.text("Subtotal:", 20, yPos);
  doc.text(sale.subtotal.toFixed(2), 190, yPos, { align: "right" });
  yPos += 6;

  if (sale.discountAmount) {
    doc.text("Discount:", 20, yPos);
    doc.text(`-${sale.discountAmount.toFixed(2)}`, 190, yPos, { align: "right" });
    yPos += 6;
  }

  if (sale.loyaltyPointsUsed) {
    doc.text("Loyalty Discount:", 20, yPos);
    doc.text(`-${(sale.loyaltyPointsUsed / 100).toFixed(2)}`, 190, yPos, { align: "right" });
    yPos += 6;
  }

  doc.text("Tax:", 20, yPos);
  doc.text(sale.tax.toFixed(2), 190, yPos, { align: "right" });
  yPos += 6;

  doc.setFontSize(12);
  doc.text("TOTAL:", 20, yPos);
  doc.text(sale.total.toFixed(2), 190, yPos, { align: "right" });
  yPos += 10;

  if (receiptSettings.thankYouMessage) {
    doc.setFontSize(8);
    doc.text(receiptSettings.thankYouMessage, 105, yPos, { align: "center" });
  }

  return doc;
};

/**
 * Sends a print job using window.print() or exports to PDF as fallback
 */
export const sendPrintJobToBackend = async (
  sale: Sale,
  customer: Customer | undefined,
  receiptSettings: ReceiptSettings,
  printerSettings: PrinterSettings
): Promise<boolean> => {
  try {
    if (typeof window !== "undefined") {
      const printWindow = window.open("", "_blank");
      
      if (printWindow) {
        const receiptHTML = generateReceiptHTML(sale, customer, receiptSettings, printerSettings);
        printWindow.document.write(receiptHTML);
        printWindow.document.close();
        
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
          
          setTimeout(() => {
            printWindow.close();
          }, 500);
        };
        
        toast.success("Receipt sent to printer!");
        return true;
      } else {
        toast.warning("Pop-up blocked. Exporting to PDF instead...");
        const pdf = generateReceiptPDF(sale, customer, receiptSettings);
        pdf.save(`receipt-${sale.id}.pdf`);
        toast.success("Receipt exported as PDF!");
        return true;
      }
    } else {
      const pdf = generateReceiptPDF(sale, customer, receiptSettings);
      pdf.save(`receipt-${sale.id}.pdf`);
      toast.success("Receipt exported as PDF!");
      return true;
    }
  } catch (error) {
    toast.error("Failed to print receipt. Please try again.");
    return false;
  }
};
