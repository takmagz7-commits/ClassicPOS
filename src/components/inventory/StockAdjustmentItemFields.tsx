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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdjustmentType } from "@/types/inventory";
import ProductSelectField from "./ProductSelectField";

interface StockAdjustmentItemFieldsProps<TFormValues extends FieldValues> {
  index: number;
  control: Control<TFormValues>;
  errors: FieldErrors<TFormValues>;
  isFormDisabled: boolean;
}

const StockAdjustmentItemFields = <TFormValues extends FieldValues>({
  index,
  control,
  errors,
  isFormDisabled,
}: StockAdjustmentItemFieldsProps<TFormValues>) => {
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
        name={`items.${index}.adjustmentType` as Path<TFormValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ""} disabled={isFormDisabled}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.values(AdjustmentType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
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
        name={`items.${index}.reason` as Path<TFormValues>}
        render={({ field }) => (
          <FormItem className="sm:col-span-3">
            <FormLabel>Reason</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., Damaged stock, Found item"
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

export default StockAdjustmentItemFields;