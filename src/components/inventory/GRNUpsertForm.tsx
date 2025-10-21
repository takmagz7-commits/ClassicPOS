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
import { GoodsReceivedNote, GRNItem, GRNStatus } from "@/types/inventory";
import { useSuppliers } from "@/context/SupplierContext";
import { useStores } from "@/context/StoreContext";
import { useProducts } from "@/context/ProductContext";
import { usePurchaseOrders } from "@/context/PurchaseOrderContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ItemFormList from "./ItemFormList";
import ProductItemFields from "./ProductItemFields";
import { useProductItemNameUpdater } from "@/hooks/use-product-item-name-updater";

// Define item schema with required fields, including an ID
const grnItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().min(1, { message: "Product is required." }),
  productName: z.string().optional(),
  quantityReceived: z.coerce.number().int().min(1, { message: "Quantity must be at least 1." }),
  unitCost: z.coerce.number().min(0.01, { message: "Unit cost must be a positive number." }),
  totalCost: z.coerce.number().min(0, { message: "Total cost must be a non-negative number." }),
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
  purchaseOrderId: z.string().optional().or(z.literal("")),
  supplierId: z.string().min(1, { message: "Supplier is required." }),
  referenceNo: z.string().min(1, { message: "Reference number is required." }),
  receivedDate: z.date({ required_error: "Received date is required." }),
  receivingStoreId: z.string().min(1, { message: "Receiving store is required." }),
  items: z.array(grnItemSchema).min(1, { message: "At least one item is required." }),
  notes: z.string().optional().or(z.literal("")),
});

export type GRNFormValues = z.infer<typeof formSchema>;

type NewGRNData = Omit<GoodsReceivedNote, "id" | "status" | "supplierName" | "receivingStoreName" | "approvedByUserName" | "approvalDate">;

interface GRNUpsertFormProps {
  initialGRN?: GoodsReceivedNote;
  onGRNSubmit: (grn: GoodsReceivedNote | NewGRNData) => void;
  onClose: () => void;
}

const GRNUpsertForm = ({ initialGRN, onGRNSubmit, onClose }: GRNUpsertFormProps) => {
  const isEditMode = !!initialGRN;
  const { suppliers } = useSuppliers();
  const { stores } = useStores();
  const { products } = useProducts();
  const { purchaseOrders, getPurchaseOrderById } = usePurchaseOrders();

  const form = useForm<GRNFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      purchaseOrderId: initialGRN?.purchaseOrderId || "",
      supplierId: initialGRN?.supplierId || "",
      referenceNo: initialGRN?.referenceNo || "",
      receivedDate: initialGRN?.receivedDate ? new Date(initialGRN.receivedDate) : startOfDay(new Date()),
      receivingStoreId: initialGRN?.receivingStoreId || "",
      items: initialGRN?.items?.length
        ? initialGRN.items.map(item => ({ ...item, id: item.id, productName: item.productName || products.find(p => p.id === item.productId)?.name || "" })) as GRNItem[]
        : [{ id: crypto.randomUUID(), productId: "", productName: "", quantityReceived: 1, unitCost: 0.01, totalCost: 0.01 }] as GRNItem[],
      notes: initialGRN?.notes || undefined,
    },
  });

  const selectedPurchaseOrderId = form.watch("purchaseOrderId");
  const isLinkedToPO = !!selectedPurchaseOrderId && selectedPurchaseOrderId !== "none";
  const isFormDisabled = isEditMode && initialGRN?.status === "approved";

  // Use the new hook for productName auto-population
  useProductItemNameUpdater({
    watch: form.watch,
    getValues: form.getValues,
    setValue: form.setValue,
    products: products,
    itemsFieldName: "items",
  });

  useEffect(() => {
    if (selectedPurchaseOrderId && selectedPurchaseOrderId !== "none") {
      const po = getPurchaseOrderById(selectedPurchaseOrderId);
      if (po) {
        form.setValue("supplierId", po.supplierId);
        form.setValue("items", po.items.map(item => {
          const product = products.find(p => p.id === item.productId);
          return {
            id: crypto.randomUUID(),
            productId: item.productId,
            productName: product?.name || "",
            quantityReceived: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.quantity * item.unitCost,
          };
        }) as GRNItem[]);
        form.setValue("notes", `Linked to PO: ${po.referenceNo}`);
      }
    } else if (!isEditMode) {
      form.setValue("supplierId", "");
      form.setValue("items", [{ id: crypto.randomUUID(), productId: "", productName: "", quantityReceived: 1, unitCost: 0.01, totalCost: 0.01 }] as GRNItem[]);
      form.setValue("notes", undefined);
    }
  }, [selectedPurchaseOrderId, getPurchaseOrderById, form, isEditMode, products]);

  useEffect(() => {
    if (initialGRN) {
      form.reset({
        purchaseOrderId: initialGRN.purchaseOrderId || "",
        supplierId: initialGRN.supplierId,
        referenceNo: initialGRN.referenceNo,
        receivedDate: new Date(initialGRN.receivedDate),
        receivingStoreId: initialGRN.receivingStoreId,
        items: initialGRN.items.map(item => ({
          ...item,
          id: item.id,
          productName: item.productName || products.find(p => p.id === item.productId)?.name || "",
        })) as GRNItem[],
        notes: initialGRN.notes || undefined,
      });
    } else {
      form.reset({
        purchaseOrderId: "",
        supplierId: "",
        referenceNo: "",
        receivedDate: startOfDay(new Date()),
        receivingStoreId: "",
        items: [{ id: crypto.randomUUID(), productId: "", productName: "", quantityReceived: 1, unitCost: 0.01, totalCost: 0.01 }] as GRNItem[],
        notes: undefined,
      });
    }
  }, [initialGRN, form, products]);

  // Effect to automatically populate totalCost (productName is now handled by hook)
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith("items.") && (name.endsWith(".quantityReceived") || name.endsWith(".unitCost"))) {
        const items = (value.items || []) as GRNItem[];
        if (items) {
          const indexMatch = name.match(/\.(\d+)\.(quantityReceived|unitCost)$/);
          if (indexMatch) {
            const index = parseInt(indexMatch[1], 10);
            const item = items[index];

            if (item) {
              const calculatedTotalCost = (item.quantityReceived || 0) * (item.unitCost || 0);
              if (item.totalCost !== calculatedTotalCost) {
                form.setValue(`items.${index}.totalCost`, calculatedTotalCost, { shouldValidate: true });
              }
            }
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = (values: GRNFormValues) => {
    const totalValue = values.items.reduce((sum, item) => sum + (item.quantityReceived * item.unitCost), 0);

    // Explicitly cast values.items to GRNItem[]
    const grnItems: GRNItem[] = values.items as GRNItem[];

    const baseGRN = {
      purchaseOrderId: values.purchaseOrderId === "none" ? undefined : values.purchaseOrderId,
      supplierId: values.supplierId,
      referenceNo: values.referenceNo,
      receivedDate: values.receivedDate.toISOString(),
      receivingStoreId: values.receivingStoreId,
      items: grnItems,
      totalValue: totalValue,
      notes: values.notes || undefined,
    };

    let grnToSubmit: GoodsReceivedNote | NewGRNData;

    if (isEditMode) {
      grnToSubmit = {
        ...initialGRN!,
        ...baseGRN,
        id: initialGRN!.id,
      };
    } else {
      grnToSubmit = baseGRN;
    }

    onGRNSubmit(grnToSubmit);
    onClose();
  };

  // Explicitly declare the type of 'items' with a type assertion
  const items = (form.watch("items") || []) as GRNItem[];

  const handleAddItem = () => {
    form.setValue("items", [...items, { id: crypto.randomUUID(), productId: "", productName: "", quantityReceived: 1, unitCost: 0.01, totalCost: 0.01 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    form.setValue("items", newItems);
  };

  const availablePurchaseOrders = purchaseOrders.filter(po => po.status === "pending" || po.status === "completed");

  return (
    <ShadcnForm {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="purchaseOrderId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link to Purchase Order (Optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={isFormDisabled}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Purchase Order" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">No Purchase Order</SelectItem>
                {availablePurchaseOrders.map((po) => (
                  <SelectItem key={po.id} value={po.id}>
                    {po.referenceNo} ({suppliers.find(s => s.id === po.supplierId)?.name || "Unknown"})
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
          name="supplierId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={isLinkedToPO || isFormDisabled}>
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
                <Input placeholder="e.g., GRN-2023-001" {...field} disabled={isFormDisabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="receivedDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Received Date</FormLabel>
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
          name="receivingStoreId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Receiving Store</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={isFormDisabled}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a receiving store" />
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
            <CardTitle className="text-base">Received Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ItemFormList<GRNFormValues, GRNItem>
              items={items}
              onRemoveItem={handleRemoveItem}
              onAddItem={handleAddItem}
              control={form.control}
              errors={form.formState.errors}
              renderItem={(item, idx, ctrl, errs, isDisabled) => (
                <ProductItemFields<GRNFormValues>
                  index={idx}
                  control={ctrl}
                  errors={errs}
                  isFormDisabled={isLinkedToPO || isDisabled}
                  itemType="grn"
                />
              )}
              isRemoveButtonDisabled={isLinkedToPO || isFormDisabled}
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
                <Textarea placeholder="Any additional notes for this Goods Received Note..." {...field} disabled={isFormDisabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isFormDisabled}>
          {isEditMode ? "Save Changes" : "Create GRN"}
        </Button>
        {isFormDisabled && (
          <p className="text-sm text-muted-foreground text-center mt-2">
            Approved GRNs cannot be edited.
          </p>
        )}
      </form>
    </ShadcnForm>
  );
};

export default GRNUpsertForm;