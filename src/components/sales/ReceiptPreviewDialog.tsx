"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sale } from "@/types/sale";
import { Customer } from "@/types/customer";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { useReceiptSettings } from "@/context/ReceiptSettingsContext";
import { Printer, Mail, Share2 } from "lucide-react"; // Added Mail and Share2 icons
import { format } from "date-fns";
import { useProducts } from "@/context/ProductContext";
import { sendPrintJobToBackend } from "@/services/printService";
import { usePrinterSettings } from "@/context/PrinterSettingsContext";
import { useCategories } from "@/context/CategoryContext";
import { toast } from "sonner"; // Import toast
import { useAuth } from "@/components/auth/AuthContext"; // New import
import { useLoyaltySettings } from "@/context/LoyaltySettingsContext"; // New import
import { getApiBaseUrl } from "@/utils/platformConfig";

const API_BASE_URL = getApiBaseUrl();

interface ReceiptPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  customer?: Customer;
}

const ReceiptPreviewDialog = ({ isOpen, onClose, sale, customer }: ReceiptPreviewDialogProps) => {
  const { currentCurrency } = useCurrency();
  const { receiptSettings } = useReceiptSettings();
  const { printerSettings } = usePrinterSettings();
  const { products } = useProducts();
  const { getCategoryName } = useCategories();
  const { users } = useAuth(); // Get all users to find employee names
  const { pointsToCurrencyRate } = useLoyaltySettings(); // Use centralized rate

  const handlePrint = async () => {
    await sendPrintJobToBackend(sale, customer, receiptSettings, printerSettings);
    onClose();
  };

  const handleEmailReceipt = async () => {
    if (!customer || !customer.email) {
      toast.error("Customer email is required to send receipt.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/sales/send-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          saleId: sale.id,
          customerEmail: customer.email,
          receiptData: {
            sale,
            customer,
            receiptSettings
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || `Receipt sent to ${customer.email}`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to send receipt");
      }
    } catch (error) {
      toast.error("Failed to send receipt. Please try again.");
    }
  };

  const handleShareReceipt = async () => {
    const receiptText = `
${receiptSettings.storeName}
${receiptSettings.storeAddress}
${receiptSettings.storePhone}

Receipt #${sale.id}
Date: ${format(new Date(sale.date), "PPpp")}
${customer ? `Customer: ${customer.name}` : ""}

Items:
${sale.items.map(item => `${item.name} x${item.quantity} - ${formatCurrency(item.price * item.quantity, currentCurrency)}`).join("\n")}

Subtotal: ${formatCurrency(sale.subtotal, currentCurrency)}
${sale.discountAmount ? `Discount: -${formatCurrency(sale.discountAmount, currentCurrency)}` : ""}
${loyaltyPointsDiscountAmount > 0 ? `Loyalty Discount: -${formatCurrency(loyaltyPointsDiscountAmount, currentCurrency)}` : ""}
Tax: ${formatCurrency(sale.tax, currentCurrency)}
TOTAL: ${formatCurrency(sale.total, currentCurrency)}

${receiptSettings.thankYouMessage || "Thank you for your business!"}
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt #${sale.id}`,
          text: receiptText,
        });
        toast.success("Receipt shared successfully!");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          toast.error("Failed to share receipt.");
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(receiptText);
        toast.success("Receipt copied to clipboard!");
      } catch (error) {
        toast.error("Sharing not supported on this device. Unable to copy to clipboard.");
      }
    }
  };

  // Calculate loyalty points discount amount for display on receipt
  const loyaltyPointsDiscountAmount = sale.loyaltyPointsUsed ? sale.loyaltyPointsUsed / pointsToCurrencyRate : 0;
  const subtotalAfterAllDiscounts = sale.subtotal - (sale.discountAmount || 0) - loyaltyPointsDiscountAmount;
  const pointsEarnedThisSale = Math.floor(subtotalAfterAllDiscounts);

  const employeeWhoMadeSale = sale.employeeId ? users.find(u => u.id === sale.employeeId)?.email : undefined;
  const employeeWhoHeldSale = sale.heldByEmployeeId ? users.find(u => u.id === sale.heldByEmployeeId)?.email : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sale Receipt</DialogTitle>
          <DialogDescription>
            Review the receipt for Sale ID: <span className="font-semibold">{sale.id.substring(0, 8)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 border rounded-md bg-white dark:bg-gray-900 text-sm">
          <div className="text-center mb-4">
            {receiptSettings.logoUrl && (
              <img src={receiptSettings.logoUrl} alt={`${receiptSettings.storeName} Logo`} className="mx-auto h-16 mb-2" />
            )}
            <h3 className="text-lg font-bold">{receiptSettings.storeName}</h3>
            <p className="text-xs text-muted-foreground">{receiptSettings.storeAddress}</p>
            <p className="text-xs text-muted-foreground">{receiptSettings.storePhone}</p>
            {receiptSettings.storeWebsite && <p className="text-xs text-muted-foreground">{receiptSettings.storeWebsite}</p>}
          </div>

          <Separator className="my-2" />

          <div className="flex justify-between text-xs mb-1">
            <span>Date:</span>
            <span>{format(new Date(sale.date), "MMM dd, yyyy HH:mm")}</span>
          </div>
          <div className="flex justify-between text-xs mb-2">
            <span>Sale ID:</span>
            <span>{sale.id.substring(0, 8)}</span>
          </div>
          {sale.storeName && (
            <div className="flex justify-between text-xs mb-1">
              <span>Store:</span>
              <span>{sale.storeName}</span>
            </div>
          )}
          {employeeWhoMadeSale && (
            <div className="flex justify-between text-xs mb-1">
              <span>Processed By:</span>
              <span>{employeeWhoMadeSale}</span>
            </div>
          )}
          {employeeWhoHeldSale && (
            <div className="flex justify-between text-xs mb-2">
              <span>Held By:</span>
              <span>{employeeWhoHeldSale}</span>
            </div>
          )}

          {receiptSettings.showCustomerInfo && customer && (
            <>
              <Separator className="my-2" />
              <p className="font-semibold text-xs mb-1">Customer Info:</p>
              <div className="flex justify-between text-xs">
                <span>Name:</span>
                <span>{customer.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Email:</span>
                <span>{customer.email}</span>
              </div>
              {receiptSettings.showVatTin && customer.vatNumber && (
                <div className="flex justify-between text-xs">
                  <span>VAT Number:</span>
                  <span>{customer.vatNumber}</span>
                </div>
              )}
              {receiptSettings.showVatTin && customer.tinNumber && (
                <div className="flex justify-between text-xs">
                  <span>TIN Number:</span>
                  <span>{customer.tinNumber}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span>Current Loyalty Points:</span>
                <span>{customer.loyaltyPoints}</span>
              </div>
            </>
          )}

          <Separator className="my-2" />

          <p className="font-semibold text-xs mb-1">Items:</p>
          {sale.items.map((item) => {
            const product = products.find(p => p.id === item.productId);
            return (
              <React.Fragment key={item.productId}>
                <div className="grid grid-cols-4 gap-2 text-xs mb-1">
                  <span className="col-span-2">{item.name}</span>
                  <span className="text-center">{item.quantity}x</span>
                  <span className="text-right">{formatCurrency(item.price, currentCurrency)}</span>
                  <span className="text-right font-medium">{formatCurrency(item.price * item.quantity, currentCurrency)}</span>
                </div>
                {receiptSettings.showSku && product?.sku && (
                  <span className="col-span-4 text-muted-foreground text-[0.65rem] ml-2 block">SKU: {product.sku}</span>
                )}
                {receiptSettings.showCategory && product?.categoryId && (
                  <span className="col-span-4 text-muted-foreground text-[0.65rem] ml-2 block">Category: {getCategoryName(product.categoryId)}</span>
                )}
              </React.Fragment>
            );
          })}

          <Separator className="my-2" />

          <div className="flex justify-between text-xs mb-1">
            <span>Subtotal:</span>
            <span className="font-medium">{formatCurrency(sale.subtotal, currentCurrency)}</span>
          </div>
          {sale.discountPercentage && sale.discountAmount && sale.discountPercentage > 0 && (
            <div className="flex justify-between text-xs mb-1 text-red-600 dark:text-red-400">
              <span>Discount ({sale.discountPercentage}%):</span>
              <span className="font-medium">-{formatCurrency(sale.discountAmount, currentCurrency)}</span>
            </div>
          )}
          {loyaltyPointsDiscountAmount > 0 && (
            <div className="flex justify-between text-xs mb-1 text-red-600 dark:text-red-400">
              <span>Loyalty Points Discount:</span>
              <span className="font-medium">-{formatCurrency(loyaltyPointsDiscountAmount, currentCurrency)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs mb-1">
            <span>Tax ({(sale.taxRateApplied !== undefined ? sale.taxRateApplied * 100 : 0).toFixed(2)}%):</span>
            <span className="font-medium">{formatCurrency(sale.tax, currentCurrency)}</span>
          </div>
          {sale.giftCardAmountUsed && sale.giftCardAmountUsed > 0 && (
            <div className="flex justify-between text-xs mb-1 text-green-600 dark:text-green-400">
              <span>Gift Card Applied:</span>
              <span className="font-medium">-{formatCurrency(sale.giftCardAmountUsed, currentCurrency)}</span>
            </div>
          )}

          <Separator className="my-2" />

          <div className="flex justify-between text-base font-bold mb-4">
            <span>TOTAL:</span>
            <span>{formatCurrency(sale.total, currentCurrency)}</span>
          </div>

          {sale.loyaltyPointsUsed && sale.loyaltyPointsUsed > 0 && (
            <div className="text-center text-xs text-muted-foreground mb-1">
              <p>Redeemed {sale.loyaltyPointsUsed} loyalty points on this purchase.</p>
            </div>
          )}
          {customer && pointsEarnedThisSale > 0 && (
            <div className="text-center text-xs text-muted-foreground mb-1">
              <p>Earned {pointsEarnedThisSale} loyalty points on this purchase.</p>
            </div>
          )}

          <div className="text-center text-xs text-muted-foreground">
            <p>{receiptSettings.thankYouMessage}</p>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleEmailReceipt} className="w-full sm:w-auto">
              <Mail className="mr-2 h-4 w-4" /> Email
            </Button>
            <Button variant="outline" onClick={handleShareReceipt} className="w-full sm:w-auto">
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </div>
          <Button onClick={handlePrint} className="w-full sm:w-auto">
            <Printer className="mr-2 h-4 w-4" /> Send to Printer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptPreviewDialog;