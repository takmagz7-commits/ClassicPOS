"use client";

import React from "react";
import { Control, FieldErrors, FieldValues, Path } from "react-hook-form";
import {
  Form as ShadcnForm,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import ProductSelectField from "./ProductSelectField";

interface PurchaseOrderItemFieldsProps<TFormValues extends FieldValues> {
  index: number;
  control: Control<TFormValues>;
  errors: FieldErrors<TFormValues>;
  isFormDisabled: boolean;
}

const PurchaseOrderItemFields = <TFormValues extends FieldValues>({
  index,
  control,
  errors,
  isFormDisabled,
}: PurchaseOrderItemFieldsProps<TFormValues>) => {
  return (
    <>
      <ProductSelectField<TFormValues>
        index={index}
        control={control}
        errors={errors}
        isFormDisabled={isFormDisabled}
      />
      <FormField
        control={control}
        name={`items.${index}.quantity` as Path<TFormValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Quantity</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="1"
                {...field}
                value={field.value === undefined || field.value === null ? "" : field.value}
                disabled={isFormDisabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`items.${index}.unitCost` as Path<TFormValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Unit Cost</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                {...field}
                value={field.value === undefined || field.value === null ? "" : field.value}
                disabled={isFormDisabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

export default PurchaseOrderItemFields;