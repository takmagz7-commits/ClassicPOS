"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sale, SaleItem } from "@/types/sale"; // Import Sale type
import { Product } from "@/types/product";
import { Customer } from "@/types/customer";
import { PaymentMethod } from "@/types/payment";
import SaleCart from "@/components/sales/SaleCart";
import DiscountInput from "@/components/sales/DiscountInput";
import LoyaltyPointsInput from "@/components/sales/LoyaltyPointsInput";
import GiftCardInput from "@/components/sales/GiftCardInput";
import SaleSummary from "@/components/sales/SaleSummary";
import PaymentMethodButtons from "@/components/sales/PaymentMethodButtons";
import HeldSalesList from "@/components/sales/HeldSalesList"; // New import
import { useLoyaltySettings } from "@/context/LoyaltySettingsContext"; // New import

interface SaleRightPanelTabsProps {
  cartItems: SaleItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onApplyDiscount: (percentage: number) => void;
  currentDiscountPercentage: number;
  currentSaleSubtotal: number;
  selectedCustomer: Customer | undefined;
  onApplyLoyaltyPoints: (points: number, equivalentAmount: number) => void;
  availableLoyaltyPoints: number;
  appliedLoyaltyPoints: number;
  loyaltyPointsDiscountAmount: number;
  onApplyGiftCard: (code: string, amount: number) => void;
  currentSaleTotalBeforeGiftCard: number;
  appliedGiftCardAmount: number;
  taxRate: number;
  currentFinalTotal: number;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  onClearCart: () => void;
  hasItemsInCart: boolean;
  onResumeSale: (sale: Sale) => void; // New prop for resuming held sales
}

const SaleRightPanelTabs = ({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onApplyDiscount,
  currentDiscountPercentage,
  currentSaleSubtotal,
  selectedCustomer,
  onApplyLoyaltyPoints,
  availableLoyaltyPoints,
  appliedLoyaltyPoints,
  loyaltyPointsDiscountAmount,
  onApplyGiftCard,
  currentSaleTotalBeforeGiftCard,
  appliedGiftCardAmount,
  taxRate,
  currentFinalTotal,
  onSelectPaymentMethod,
  onClearCart,
  hasItemsInCart,
  onResumeSale, // Destructure new prop
}: SaleRightPanelTabsProps) => {
  const { isLoyaltyEnabled } = useLoyaltySettings(); // Use the new context

  return (
    <Tabs defaultValue="cart" className="flex flex-col flex-1">
      <TabsList className="grid w-full grid-cols-4"> {/* Changed to 4 columns */}
        <TabsTrigger value="cart">Cart</TabsTrigger>
        <TabsTrigger value="discounts">Discounts & Loyalty</TabsTrigger>
        <TabsTrigger value="payment">Payment</TabsTrigger>
        <TabsTrigger value="held-sales">Held Sales</TabsTrigger> {/* New Tab */}
      </TabsList>

      <TabsContent value="cart" className="flex-1 flex flex-col mt-4">
        <SaleCart
          cartItems={cartItems}
          onUpdateQuantity={onUpdateQuantity}
          onRemoveItem={onRemoveItem}
        />
      </TabsContent>

      <TabsContent value="discounts" className="flex-1 flex flex-col gap-4 mt-4">
        <DiscountInput
          onApplyDiscount={onApplyDiscount}
          currentDiscountPercentage={currentDiscountPercentage}
          currentSaleSubtotal={currentSaleSubtotal}
        />
        {isLoyaltyEnabled && selectedCustomer && ( // Conditionally render based on isLoyaltyEnabled
          <LoyaltyPointsInput
            availablePoints={availableLoyaltyPoints}
            onApplyPoints={onApplyLoyaltyPoints}
            currentSaleTotal={currentSaleTotalBeforeGiftCard - loyaltyPointsDiscountAmount}
            appliedPoints={appliedLoyaltyPoints}
          />
        )}
        <GiftCardInput
          onApplyGiftCard={onApplyGiftCard}
          currentSaleTotal={currentSaleTotalBeforeGiftCard - loyaltyPointsDiscountAmount}
          appliedGiftCardAmount={appliedGiftCardAmount}
        />
      </TabsContent>

      <TabsContent value="payment" className="flex-1 flex flex-col gap-4 mt-4">
        <SaleSummary
          subtotal={currentSaleSubtotal}
          taxRate={taxRate}
          giftCardAmountUsed={appliedGiftCardAmount}
          discountPercentage={currentDiscountPercentage}
          discountAmount={currentSaleSubtotal * (currentDiscountPercentage / 100)}
          loyaltyPointsDiscountAmount={loyaltyPointsDiscountAmount}
        />
        <PaymentMethodButtons
          onSelectPaymentMethod={onSelectPaymentMethod}
          onClearCart={onClearCart}
          hasItemsInCart={hasItemsInCart}
          finalTotal={currentFinalTotal}
        />
      </TabsContent>

      <TabsContent value="held-sales" className="flex-1 flex flex-col mt-4"> {/* New Tab Content */}
        <HeldSalesList onResumeSale={onResumeSale} />
      </TabsContent>
    </Tabs>
  );
};

export default SaleRightPanelTabs;