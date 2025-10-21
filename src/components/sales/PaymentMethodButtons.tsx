"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Apple, Banknote } from "lucide-react"; // Added Banknote for generic cash/card
import { cn } from "@/lib/utils";
import { usePaymentMethods } from "@/context/PaymentMethodContext";
import { PaymentMethod } from "@/types/payment";

interface PaymentMethodButtonsProps {
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  onClearCart: () => void;
  hasItemsInCart: boolean;
  finalTotal: number;
}

const PaymentMethodButtons = ({
  onSelectPaymentMethod,
  onClearCart,
  hasItemsInCart,
  finalTotal,
}: PaymentMethodButtonsProps) => {
  const { paymentMethods } = usePaymentMethods();

  const isDisabled = !hasItemsInCart || finalTotal < 0;

  const getIconForMethod = (methodName: string) => {
    if (methodName.toLowerCase().includes("apple pay")) return <Apple className="mr-2 h-4 w-4" />;
    if (methodName.toLowerCase().includes("google pay")) return <CreditCard className="mr-2 h-4 w-4" />;
    if (methodName.toLowerCase().includes("credit")) return <CreditCard className="mr-2 h-4 w-4" />;
    if (methodName.toLowerCase().includes("afterpay")) return <CreditCard className="mr-2 h-4 w-4" />; // Placeholder, could be specific icon
    if (methodName.toLowerCase().includes("klarna")) return <CreditCard className="mr-2 h-4 w-4" />; // Placeholder, could be specific icon
    return <Banknote className="mr-2 h-4 w-4" />; // Default icon
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-semibold mb-2">Payment Options</h3>
      {paymentMethods.map((method) => {
        const isMethodDisabled = isDisabled || (method.isCredit && finalTotal === 0);
        let buttonClasses = "w-full";

        if (method.name.toLowerCase().includes("apple pay")) {
          buttonClasses = cn(buttonClasses, "bg-black text-white hover:bg-gray-800");
        } else if (method.name.toLowerCase().includes("google pay")) {
          buttonClasses = cn(buttonClasses, "bg-blue-600 text-white hover:bg-blue-700");
        } else if (method.isCredit) {
          buttonClasses = cn(buttonClasses, "bg-purple-600 text-white hover:bg-purple-700");
        } else if (method.isBNPL) {
          if (method.name.toLowerCase().includes("afterpay")) {
            buttonClasses = cn(buttonClasses, "bg-green-500 text-white hover:bg-green-600");
          } else if (method.name.toLowerCase().includes("klarna")) {
            buttonClasses = cn(buttonClasses, "bg-pink-400 text-white hover:bg-pink-500");
          } else {
            buttonClasses = cn(buttonClasses, "bg-indigo-500 text-white hover:bg-indigo-600");
          }
        }

        return (
          <Button
            key={method.id}
            onClick={() => onSelectPaymentMethod(method)}
            className={cn(buttonClasses, isMethodDisabled && "opacity-50 cursor-not-allowed")}
            disabled={isMethodDisabled}
          >
            {getIconForMethod(method.name)} {method.name}
          </Button>
        );
      })}
      <Button onClick={onClearCart} variant="outline" className="w-full" disabled={!hasItemsInCart}>
        Clear Cart
      </Button>
    </div>
  );
};

export default PaymentMethodButtons;