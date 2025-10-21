"use client";

import React, { useEffect } from "react";
import { useForm, FieldError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form as ShadcnForm,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Product } from "@/types/product";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "@/context/CategoryContext";
import { Switch } from "@/components/ui/switch";
import { useStores } from "@/context/StoreContext";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Product name must be at least 2 characters.",
  }),
  categoryId: z.string().min(1, {
    message: "Please select a category.",
  }),
  price: z.coerce.number().min(0.01, {
    message: "Price must be a positive number.",
  }),
  cost: z.coerce.number().min(0, {
    message: "Cost must be a non-negative number.",
  }),
  wholesalePrice: z.coerce.number().min(0, {
    message: "Wholesale price must be a non-negative number.",
  }),
  // Removed direct 'stock' field
  trackStock: z.boolean(),
  availableForSale: z.boolean(),
  sku: z.string().min(3, {
    message: "SKU must be at least 3 characters.",
  }),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
  // New: stockByStore field
  stockByStore: z.record(z.string(), z.coerce.number().int().min(0, { message: "Stock must be a non-negative integer." })).optional(),
}).superRefine((data, ctx) => {
  if (data.trackStock) {
    const totalStock = data.stockByStore ? Object.values(data.stockByStore).reduce((sum, qty) => sum + qty, 0) : 0;
    if (totalStock === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "If tracking stock, at least one store must have a quantity greater than 0.",
        path: ["stockByStore"],
      });
    }
  }
});

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductUpsertFormProps {
  initialProduct?: Product; // Optional: if provided, it's an edit operation
  onProductSubmit: (product: Product) => void;
  onClose: () => void;
}

const ProductUpsertForm = ({ initialProduct, onProductSubmit, onClose }: ProductUpsertFormProps) => {
  const { categories } = useCategories();
  const { stores } = useStores();
  const isEditMode = !!initialProduct;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialProduct?.name || "",
      categoryId: initialProduct?.categoryId || "",
      price: initialProduct?.price || 0,
      cost: initialProduct?.cost || 0,
      wholesalePrice: initialProduct?.wholesalePrice || 0,
      trackStock: initialProduct?.trackStock ?? true,
      availableForSale: initialProduct?.availableForSale ?? true,
      sku: initialProduct?.sku || "",
      imageUrl: initialProduct?.imageUrl || "",
      stockByStore: initialProduct?.stockByStore || {},
    },
  });

  // Reset form with new initialProduct if it changes (e.g., when editing a different product)
  useEffect(() => {
    // Ensure stockByStore has an entry for every store, defaulting to 0 if not present
    const initialStockByStore: { [storeId: string]: number } = {};
    stores.forEach(store => {
      initialStockByStore[store.id] = initialProduct?.stockByStore?.[store.id] ?? 0;
    });

    form.reset({
      name: initialProduct?.name || "",
      categoryId: initialProduct?.categoryId || "",
      price: initialProduct?.price || 0,
      cost: initialProduct?.cost || 0,
      wholesalePrice: initialProduct?.wholesalePrice || 0,
      trackStock: initialProduct?.trackStock ?? true,
      availableForSale: initialProduct?.availableForSale ?? true,
      sku: initialProduct?.sku || "",
      imageUrl: initialProduct?.imageUrl || "",
      stockByStore: initialStockByStore,
    });
  }, [initialProduct, form, stores]);

  const onSubmit = (values: ProductFormValues) => {
    let productToSubmit: Product;

    // Calculate total stock from stockByStore if tracking is enabled
    const calculatedTotalStock = values.trackStock && values.stockByStore
      ? Object.values(values.stockByStore).reduce((sum, qty) => sum + qty, 0)
      : 0;

    if (isEditMode) {
      productToSubmit = {
        id: initialProduct!.id,
        name: values.name,
        categoryId: values.categoryId,
        price: values.price,
        cost: values.cost,
        wholesalePrice: values.wholesalePrice,
        stock: calculatedTotalStock,
        stockByStore: values.trackStock ? values.stockByStore : undefined,
        trackStock: values.trackStock,
        availableForSale: values.availableForSale,
        sku: values.sku,
        imageUrl: values.imageUrl,
      };
    } else {
      productToSubmit = {
        id: crypto.randomUUID(),
        name: values.name,
        categoryId: values.categoryId,
        price: values.price,
        cost: values.cost,
        wholesalePrice: values.wholesalePrice,
        stock: calculatedTotalStock,
        stockByStore: values.trackStock ? values.stockByStore : undefined,
        trackStock: values.trackStock,
        availableForSale: values.availableForSale,
        sku: values.sku,
        imageUrl: values.imageUrl,
      };
    }

    onProductSubmit(productToSubmit);
    toast.success(`Product ${isEditMode ? "updated" : "added"} successfully!`);
    onClose();
    form.reset();
  };

  const trackStock = form.watch("trackStock");
  // Directly access the message property with a type assertion
  const stockByStoreErrorMessage: string = (form.formState.errors.stockByStore as unknown as FieldError)?.message || '';

  return (
    <ShadcnForm {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Laptop Pro" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Retail Price</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cost Price</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="e.g., 850.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="wholesalePrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wholesale Price</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="e.g., 750.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="trackStock"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Track Stock</FormLabel>
                <FormDescription>
                  Enable to manage inventory levels for this product.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {trackStock && (
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="text-base font-semibold">Stock Quantity by Store</h3>
            {stores.length > 0 ? (
              stores.map((store) => (
                <FormField
                  key={store.id}
                  control={form.control}
                  name={`stockByStore.${store.id}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{store.name} Stock</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? 0 : parseInt(value, 10));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No stores configured. Please add stores in settings to manage per-store stock.</p>
            )}
            {stockByStoreErrorMessage && (
              <p className="text-sm font-medium text-destructive">
                {stockByStoreErrorMessage}
              </p>
            )}
          </div>
        )}

        <FormField
          control={form.control}
          name="availableForSale"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Available for Sale</FormLabel>
                <FormDescription>
                  Toggle visibility and purchasability in the sales terminal.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU</FormLabel>
              <FormControl>
                <Input placeholder="e.g., LP-001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/image.png" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {isEditMode ? "Save Changes" : "Add Product"}
        </Button>
      </form>
    </ShadcnForm>
  );
};

export default ProductUpsertForm;