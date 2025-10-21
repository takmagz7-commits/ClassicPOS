"use client";

import React from "react";
import { Control, FieldErrors, FieldValues } from "react-hook-form";

import PurchaseOrderItemFields from "./PurchaseOrderItemFields";
import GrnItemFields from "./GrnItemFields";
import StockAdjustmentItemFields from "./StockAdjustmentItemFields";
import TransferOfGoodsItemFields from "./TransferOfGoodsItemFields";
import { Form as ShadcnForm } from "@/components/ui/form";

interface ProductItemFieldsProps<TFormValues extends FieldValues> {
  index: number;
  control: Control<TFormValues>;
  errors: FieldErrors<TFormValues>;
  isFormDisabled: boolean;
  itemType: "purchaseOrder" | "grn" | "stockAdjustment" | "transferOfGoods";
  transferFromStoreId?: string;
}

const ProductItemFields = <TFormValues extends FieldValues>({
  index,
  control,
  errors,
  isFormDisabled,
  itemType,
  transferFromStoreId,
}: ProductItemFieldsProps<TFormValues>) => {
  switch (itemType) {
    case "purchaseOrder":
      return (
        <PurchaseOrderItemFields<TFormValues>
          index={index}
          control={control}
          errors={errors}
          isFormDisabled={isFormDisabled}
        />
      );
    case "grn":
      return (
        <GrnItemFields<TFormValues>
          index={index}
          control={control}
          errors={errors}
          isFormDisabled={isFormDisabled}
        />
      );
    case "stockAdjustment":
      return (
        <StockAdjustmentItemFields<TFormValues>
          index={index}
          control={control}
          errors={errors}
          isFormDisabled={isFormDisabled}
        />
      );
    case "transferOfGoods":
      return (
        <TransferOfGoodsItemFields<TFormValues>
          index={index}
          control={control}
          errors={errors}
          isFormDisabled={isFormDisabled}
          transferFromStoreId={transferFromStoreId}
        />
      );
    default:
      return null;
  }
};

export default ProductItemFields;