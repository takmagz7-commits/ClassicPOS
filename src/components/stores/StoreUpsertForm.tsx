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
import { Store } from "@/types/store";

const formSchema = z.object({
  name: z.string().min(2, { message: "Store name must be at least 2 characters." }),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email({ message: "Please enter a valid email address." }).optional().or(z.literal("")),
});

type StoreFormValues = z.infer<typeof formSchema>;

interface StoreUpsertFormProps {
  initialStore?: Store;
  onStoreSubmit: (storeData: Omit<Store, "id"> | Store) => void;
  onClose: () => void;
}

const StoreUpsertForm = ({ initialStore, onStoreSubmit, onClose }: StoreUpsertFormProps) => {
  const isEditMode = !!initialStore;

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialStore || {
      name: "",
      address: "",
      phone: "",
      email: "",
    },
  });

  useEffect(() => {
    form.reset(initialStore || { name: "", address: "", phone: "", email: "" });
  }, [initialStore, form]);

  const onSubmit = (values: StoreFormValues) => {
    if (isEditMode) {
      const updatedStore: Store = { ...initialStore!, ...values };
      onStoreSubmit(updatedStore);
    } else {
      onStoreSubmit(values as Omit<Store, "id">);
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
              <FormLabel>Store Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Downtown Flagship" {...field} />
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
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 123 Main St, Metropolis" {...field} />
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
                <Input placeholder="e.g., 555-123-4567" {...field} />
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
                <Input type="email" placeholder="e.g., store@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {isEditMode ? "Save Changes" : "Add Store"}
        </Button>
      </form>
    </ShadcnForm>
  );
};

export default StoreUpsertForm;