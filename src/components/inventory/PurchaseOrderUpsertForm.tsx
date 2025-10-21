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
import { CalendarIcon, PlusCircle, MinusCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, PURCHASE_ORDER_STATUSES } from "@/types/inventory";
import { useSuppliers } from "@/context/SupplierContext";
import { useProducts } from "@/context/ProductContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ItemFormList from "./ItemFormList";
import ProductItemFields from "./ProductItemFields";
import { useProductItemNameUpdater } from "@/hooks/use-product-item-name-updater";

// Define item schema with required fields, including an ID
const purchaseOrderItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().min(1, { message: "Product is required." }),
  productName: z.string().optional(),
  quantity: z.coerce.number().int().min(1, { message: "Quantity must be at least 1." }),
  unitCost: z.coerce.number().min(0.01, { message: "Unit cost must be a positive number." }),
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
  supplierId: z.string().min(1, { message: "Supplier is required." }),
  referenceNo: z.string().min(1, { message: "Reference number is required." }),
  orderDate: z.date({ required_error: "Order date is required." }),
  expectedDeliveryDate: z.date().optional(),
  status: z.enum(PURCHASE_ORDER_STATUSES),
  items: z.array(purchaseOrderItemSchema).min(1, { message: "At least one item is required." }),
  notes: z.string().optional().or(z.literal("")),
});

export type PurchaseOrderFormValues = z.infer<typeof formSchema>;

interface PurchaseOrderUpsertFormProps {
  initialPurchaseOrder?: PurchaseOrder;
  onPurchaseOrderSubmit: (order: PurchaseOrder | Omit<PurchaseOrder, "id" | "supplierName">) => void;
  onClose: () => void;
}

const PurchaseOrderUpsertForm = ({ initialPurchaseOrder, onPurchaseOrderSubmit, onClose }: PurchaseOrderUpsertFormProps) => {
  const isEditMode = !!initialPurchaseOrder;
  const { suppliers } = useSuppliers();
  const { products } = useProducts();

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierId: initialPurchaseOrder?.supplierId || "",
      referenceNo: initialPurchaseOrder?.referenceNo || "",
      orderDate: initialPurchaseOrder?.orderDate ? new Date(initialPurchaseOrder.orderDate) : startOfDay(new Date()),
      expectedDeliveryDate: initialPurchaseOrder?.expectedDeliveryDate ? new Date(initialPurchaseOrder.expectedDeliveryDate) : undefined,
      status: initialPurchaseOrder?.status || "pending",
      items: initialPurchaseOrder?.items?.length
        ? initialPurchaseOrder.items.map(item => ({ ...item, id: item.id, productName: item.productName || products.find(p => p.id === item.productId)?.name || "" })) as PurchaseOrderItem[]
        : [{ id: crypto.randomUUID(), productId: "", productName: "", quantity: 1, unitCost: 0.01 }] as PurchaseOrderItem[],
      notes: initialPurchaseOrder?.notes || undefined,
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

  useEffect(() => {
    if (initialPurchaseOrder) {
      form.reset({
        supplierId: initialPurchaseOrder.supplierId,
        referenceNo: initialPurchaseOrder.referenceNo,
        orderDate: new Date(initialPurchaseOrder.orderDate),
        expectedDeliveryDate: initialPurchaseOrder.expectedDeliveryDate ? new Date(initialPurchaseOrder.expectedDeliveryDate) : undefined,
        status: initialPurchaseOrder.status,
        items: initialPurchaseOrder.items.map(item => ({ ...item, id: item.id, productName: item.productName || products.find(p => p.id === item.productId)?.name || "" })) as PurchaseOrderItem[],
        notes: initialPurchaseOrder.notes || undefined,
      });
    } else {
      form.reset({
        supplierId: "",
        referenceNo: "",
        orderDate: startOfDay(new Date()),
        expectedDeliveryDate: undefined,
        status: "pending",
        items: [{ id: crypto.randomUUID(), productId: "", productName: "", quantity: 1, unitCost: 0.01 }] as PurchaseOrderItem[],
        notes: undefined,
      });
    }
  }, [initialPurchaseOrder, form, products]);

  const onSubmit = (values: PurchaseOrderFormValues) => {
    const totalValue = values.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

    // Explicitly cast values.items to PurchaseOrderItem[]
    const orderItems: PurchaseOrderItem[] = values.items as PurchaseOrderItem[];

    const formValuesWithoutSupplierName = {
      supplierId: values.supplierId,
      referenceNo: values.referenceNo,
      orderDate: values.orderDate.toISOString(),
      expectedDeliveryDate: values.expectedDeliveryDate?.toISOString(),
      status: values.status,
      items: orderItems,
      totalValue: totalValue,
      notes: values.notes || undefined,
    };

    let orderToSubmit: PurchaseOrder | Omit<PurchaseOrder, "id" | "supplierName">;

    if (isEditMode) {
      orderToSubmit = {
        ...initialPurchaseOrder!,
        ...formValuesWithoutSupplierName,
        id: initialPurchaseOrder!.id,
        supplierName: initialPurchaseOrder!.supplierName,
      };
    } else {
      orderToSubmit = formValuesWithoutSupplierName;
    }

    onPurchaseOrderSubmit(orderToSubmit);
    onClose();
  };

  // Explicitly declare the type of 'items' with a type assertion
  const items = (form.watch("items") || []) as PurchaseOrderItem[];

  const handleAddItem = () => {
    form.setValue("items", [...items, { id: crypto.randomUUID(), productId: "", productName: "", quantity: 1, unitCost: 0.01 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    form.setValue("items", newItems);
  };

  const isFormDisabled = isEditMode && initialPurchaseOrder?.status !== "pending";

  return (
    <ShadcnForm {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="supplierId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={isFormDisabled}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
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
          name="referenceNo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g., PO-2023-001" {...field} disabled={isFormDisabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="orderDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Order Date</FormLabel>
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
          name="expectedDeliveryDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Expected Delivery Date (Optional)</FormLabel>
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
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={isFormDisabled}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PURCHASE_ORDER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
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
            <CardTitle className="text-base">Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ItemFormList<PurchaseOrderFormValues, PurchaseOrderItem>
              items={items}
              onRemoveItem={handleRemoveItem}
              onAddItem={handleAddItem}
              control={form.control}
              errors={form.formState.errors}
              renderItem={(item, idx, ctrl, errs, isDisabled) => (
                <ProductItemFields<PurchaseOrderFormValues>
                  index={idx}
                  control={ctrl}
                  errors={errs}
                  isFormDisabled={isDisabled}
                  itemType="purchaseOrder"
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
                <Textarea placeholder="Any additional notes for this purchase order..." {...field} disabled={isFormDisabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isFormDisabled}>
          {isEditMode ? "Save Changes" : "Create Purchase Order"}
        </Button>
        {isFormDisabled && (
          <p className="text-sm text-muted-foreground text-center mt-2">
            Completed or cancelled purchase orders cannot be edited.
          </p>
        )}
      </form>
    </ShadcnForm>
  );
};

export default PurchaseOrderUpsertForm;