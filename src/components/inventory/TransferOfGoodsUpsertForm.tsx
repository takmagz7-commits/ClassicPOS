"use client";

import React, { useEffect } from "react";
import { useForm, Control, FieldErrors } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, PlusCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { TransferOfGoods, TransferOfGoodsItem } from "@/types/inventory";
import { useStores } from "@/context/StoreContext";
import { useProducts } from "@/context/ProductContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ItemFormList from "./ItemFormList";
import ProductItemFields from "./ProductItemFields";
import { useProductItemNameUpdater } from "@/hooks/use-product-item-name-updater";

// Define a schema for the items with required fields, including an ID
const itemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().min(1, { message: "Product is required." }),
  productName: z.string().optional(),
  quantity: z.coerce.number().int().min(1, { message: "Quantity must be at least 1." }),
}).superRefine((data, ctx) => {
  if (data.productId && (!data.productName || data.productName.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Product name is required if a product is selected.",
      path: ["productName"],
    });
  }
});

const formSchema = z.object({
  transferDate: z.date({ required_error: "Transfer date is required." }),
  transferFromStoreId: z.string().min(1, { message: "Originating store is required." }),
  transferToStoreId: z.string().min(1, { message: "Destination store is required." }),
  items: z.array(itemSchema).min(1, { message: "At least one item is required for transfer." }),
  notes: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.transferFromStoreId && data.transferToStoreId && data.transferFromStoreId === data.transferToStoreId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Originating and destination stores cannot be the same.",
      path: ["transferToStoreId"],
    });
  }
});

export type TransferOfGoodsFormValues = z.infer<typeof formSchema>;

interface TransferOfGoodsUpsertFormProps {
  initialTransfer?: TransferOfGoods;
  onTransferSubmit: (transfer: Omit<TransferOfGoods, "id" | "status" | "transferFromStoreName" | "transferToStoreName" | "approvedByUserName" | "approvalDate" | "receivedByUserName" | "receivedDate"> | TransferOfGoods) => void;
  onClose: () => void;
}

const TransferOfGoodsUpsertForm = ({ initialTransfer, onTransferSubmit, onClose }: TransferOfGoodsUpsertFormProps) => {
  const isEditMode = !!initialTransfer;
  const { stores } = useStores();
  const { products, getEffectiveProductStock } = useProducts();

  const form = useForm<TransferOfGoodsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transferDate: initialTransfer?.transferDate ? new Date(initialTransfer.transferDate) : startOfDay(new Date()),
      transferFromStoreId: initialTransfer?.transferFromStoreId || "",
      transferToStoreId: initialTransfer?.transferToStoreId || "",
      items: initialTransfer?.items?.length
        ? initialTransfer.items.map(item => ({ ...item, id: item.id, productName: item.productName || products.find(p => p.id === item.productId)?.name || "" })) as TransferOfGoodsItem[]
        : [{ id: crypto.randomUUID(), productId: "", productName: "", quantity: 1 }] as TransferOfGoodsItem[],
      notes: initialTransfer?.notes || undefined,
    },
  });

  // Use the new hook for productName auto-population
  useProductItemNameUpdater({
    watch: form.watch,
    getValues: form.getValues,
    setValue: form.setValue,
    products: products,
    itemsFieldName: "items",
  });

  // Add custom validation for stock quantity
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name?.startsWith("items.") && (name.endsWith(".productId") || name.endsWith(".quantity"))) {
        const items = (value.items || []) as TransferOfGoodsItem[];
        const transferFromStoreId = value.transferFromStoreId;
        if (items && transferFromStoreId) {
          items.forEach((item, index) => {
            const product = products.find(p => p.id === item.productId);
            if (product && product.trackStock) {
              const stockInFromStore = getEffectiveProductStock(product.id, transferFromStoreId);
              if (item.quantity > stockInFromStore) {
                form.setError(`items.${index}.quantity`, {
                  type: "manual",
                  message: `Quantity exceeds available stock (${stockInFromStore}) in ${stores.find(s => s.id === transferFromStoreId)?.name || "selected store"}.`,
                });
              } else {
                form.clearErrors(`items.${index}.quantity`);
              }
            }
          });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, products, stores, getEffectiveProductStock]);


  useEffect(() => {
      if (initialTransfer) {
        form.reset({
          transferDate: new Date(initialTransfer.transferDate),
          transferFromStoreId: initialTransfer.transferFromStoreId,
          transferToStoreId: initialTransfer.transferToStoreId,
          items: initialTransfer.items.map(item => ({
            ...item,
            id: item.id,
            productName: item.productName || products.find(p => p.id === item.productId)?.name || "",
          })) as TransferOfGoodsItem[],
          notes: initialTransfer.notes || undefined,
        });
      } else {
        form.reset({
          transferDate: startOfDay(new Date()),
          transferFromStoreId: "",
          transferToStoreId: "",
          items: [{ id: crypto.randomUUID(), productId: "", productName: "", quantity: 1 }] as TransferOfGoodsItem[],
          notes: undefined,
        });
      }
    }, [initialTransfer, form, products]);

  const onSubmit = (values: TransferOfGoodsFormValues) => {
    // Explicitly cast values.items to TransferOfGoodsItem[]
    const transferItems: TransferOfGoodsItem[] = values.items as TransferOfGoodsItem[];

    const baseTransfer = {
      transferDate: values.transferDate.toISOString(),
      transferFromStoreId: values.transferFromStoreId,
      transferToStoreId: values.transferToStoreId,
      items: transferItems,
      notes: values.notes || undefined,
    };

    let transferToSubmit: Omit<TransferOfGoods, "id" | "status" | "transferFromStoreName" | "transferToStoreName" | "approvedByUserName" | "approvalDate" | "receivedByUserName" | "receivedDate"> | TransferOfGoods;

    if (isEditMode) {
    transferToSubmit = {
        ...initialTransfer!,
        ...baseTransfer,
        id: initialTransfer!.id,
      };
    } else {
      transferToSubmit = baseTransfer;
    }

    onTransferSubmit(transferToSubmit);
    onClose();
  };

  // Explicitly declare the type of 'items' with a type assertion
  const items = (form.watch("items") || []) as TransferOfGoodsItem[];
  const transferFromStoreId = form.watch("transferFromStoreId");
  const isFormDisabled = isEditMode && initialTransfer?.status !== "pending";

  const handleAddItem = () => {
    form.setValue("items", [...items, { id: crypto.randomUUID(), productId: "", productName: "", quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    form.setValue("items", newItems);
  };

  return (
    <ShadcnForm {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="transferDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Transfer Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={isFormDisabled}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="transferFromStoreId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From Store (Origin)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={isFormDisabled}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select originating store" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
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
          name="transferToStoreId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>To Store (Destination)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={isFormDisabled}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination store" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Items to Transfer</CardTitle>
          </CardHeader>
          <CardContent>
            <ItemFormList<TransferOfGoodsFormValues, TransferOfGoodsItem>
              items={items}
              onRemoveItem={handleRemoveItem}
              onAddItem={handleAddItem}
              control={form.control}
              errors={form.formState.errors}
              renderItem={(item, idx, ctrl, errs, isDisabled) => (
                <ProductItemFields<TransferOfGoodsFormValues>
                  index={idx}
                  control={ctrl}
                  errors={errs}
                  isFormDisabled={isDisabled}
                  itemType="transferOfGoods"
                  transferFromStoreId={transferFromStoreId}
                />
              )}
              isRemoveButtonDisabled={isFormDisabled}
              isFormDisabled={isFormDisabled}
            />
          </CardContent>
        </Card>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Any additional notes for this transfer..." {...field} disabled={isFormDisabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isFormDisabled}>
          {isEditMode ? "Save Changes" : "Create Transfer"}
        </Button>
        {isFormDisabled && (
          <p className="text-sm text-muted-foreground text-center mt-2">
            Only pending transfers can be edited.
          </p>
        )}
      </form>
    </ShadcnForm>
  );
};

export default TransferOfGoodsUpsertForm;