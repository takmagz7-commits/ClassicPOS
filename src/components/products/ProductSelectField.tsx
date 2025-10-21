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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts } from "@/context/ProductContext";

interface ProductSelectFieldProps<TFormValues extends FieldValues> {
  index: number;
  control: Control<TFormValues>;
  errors: FieldErrors<TFormValues>;
  isFormDisabled: boolean;
  // Optional: for filtering products based on a specific store's stock (e.g., for transfers)
  filterByStoreId?: string; 
}

const ProductSelectField = <TFormValues extends FieldValues>({
  index,
  control,
  errors,
  isFormDisabled,
  filterByStoreId,
}: ProductSelectFieldProps<TFormValues>) => {
  const { products, getEffectiveProductStock } = useProducts();

  const getAvailableProducts = () => {
    if (filterByStoreId) {
      return products.filter(p => {
        const stockInStore = getEffectiveProductStock(p.id, filterByStoreId);
        return p.trackStock && stockInStore > 0;
      });
    }
    return products;
  };

  return (
    <FormField
      control={control}
      name={`items.${index}.productId` as Path<TFormValues>}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Product</FormLabel>
          <Select onValueChange={field.onChange} value={field.value || ""} disabled={isFormDisabled}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {getAvailableProducts().map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name} (SKU: {product.sku})
                  {filterByStoreId && product.trackStock && ` - Stock: ${getEffectiveProductStock(product.id, filterByStoreId)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ProductSelectField;