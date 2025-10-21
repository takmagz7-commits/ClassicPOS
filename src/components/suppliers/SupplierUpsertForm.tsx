"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form as ShadcnForm,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Supplier } from "@/types/supplier";

const formSchema = z.object({
  name: z.string().min(2, { message: "Supplier name must be at least 2 characters." }),
  contactPerson: z.string().optional().or(z.literal("")),
  email: z.string().email({ message: "Please enter a valid email address." }).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  vatNumber: z.string().optional().or(z.literal("")),
  tinNumber: z.string().optional().or(z.literal("")),
});

type SupplierFormValues = z.infer<typeof formSchema>;

interface SupplierUpsertFormProps {
  initialSupplier?: Supplier;
  onSupplierSubmit: (supplierData: Omit<Supplier, "id"> | Supplier) => void;
  onClose: () => void;
}

const SupplierUpsertForm = ({ initialSupplier, onSupplierSubmit, onClose }: SupplierUpsertFormProps) => {
  const isEditMode = !!initialSupplier;

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialSupplier ? {
      name: initialSupplier.name,
      contactPerson: initialSupplier.contactPerson || undefined,
      email: initialSupplier.email || undefined,
      phone: initialSupplier.phone || undefined,
      address: initialSupplier.address || undefined,
      notes: initialSupplier.notes || undefined,
      vatNumber: initialSupplier.vatNumber || undefined,
      tinNumber: initialSupplier.tinNumber || undefined,
    } : {
      name: "",
      contactPerson: undefined,
      email: undefined,
      phone: undefined,
      address: undefined,
      notes: undefined,
      vatNumber: undefined,
      tinNumber: undefined,
    },
  });

  useEffect(() => {
    form.reset(initialSupplier ? {
      name: initialSupplier.name,
      contactPerson: initialSupplier.contactPerson || undefined,
      email: initialSupplier.email || undefined,
      phone: initialSupplier.phone || undefined,
      address: initialSupplier.address || undefined,
      notes: initialSupplier.notes || undefined,
      vatNumber: initialSupplier.vatNumber || undefined,
      tinNumber: initialSupplier.tinNumber || undefined,
    } : {
      name: "",
      contactPerson: undefined,
      email: undefined,
      phone: undefined,
      address: undefined,
      notes: undefined,
      vatNumber: undefined,
      tinNumber: undefined,
    });
  }, [initialSupplier, form]);

  const onSubmit = (values: SupplierFormValues) => {
    const cleanedValues = {
      contactPerson: values.contactPerson || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
      notes: values.notes || undefined,
      vatNumber: values.vatNumber || undefined,
      tinNumber: values.tinNumber || undefined,
    };

    if (isEditMode) {
      const updatedSupplier: Supplier = {
        ...initialSupplier!,
        name: values.name,
        ...cleanedValues,
      };
      onSupplierSubmit(updatedSupplier);
    } else {
      const newSupplierData: Omit<Supplier, "id"> = {
        name: values.name,
        ...cleanedValues,
      };
      onSupplierSubmit(newSupplierData);
    }
    onClose();
  };

  return (
    <ShadcnForm {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Tech Innovations Inc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactPerson"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Person (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Jane Doe" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email (Optional)</FormLabel>
              <FormControl>
                <Input type="email" placeholder="e.g., contact@supplier.com" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 555-123-4567" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 123 Industrial Way" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="vatNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>VAT Number (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., GB123456789" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tinNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>TIN Number (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 123-456-789" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Any relevant notes about this supplier..." {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {isEditMode ? "Save Changes" : "Add Supplier"}
        </Button>
      </form>
    </ShadcnForm>
  );
};

export default SupplierUpsertForm;