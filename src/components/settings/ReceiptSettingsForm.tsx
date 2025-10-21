"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
import { useReceiptSettings } from "@/context/ReceiptSettingsContext";
import { toast } from "sonner";

const formSchema = z.object({
  storeName: z.string().min(1, { message: "Store name is required." }),
  storeAddress: z.string().min(1, { message: "Store address is required." }),
  storePhone: z.string().min(1, { message: "Store phone is required." }),
  storeWebsite: z.string().url({ message: "Please enter a valid URL." }).or(z.literal("")),
  thankYouMessage: z.string().min(1, { message: "Thank you message is required." }),
  logoUrl: z.string().url({ message: "Please enter a valid URL." }).or(z.literal("")),
  showSku: z.boolean(),
  showCategory: z.boolean(),
  showCustomerInfo: z.boolean(),
  showVatTin: z.boolean(),
});

type ReceiptSettingsFormValues = z.infer<typeof formSchema>;

const ReceiptSettingsForm = () => {
  const { receiptSettings, updateReceiptSettings } = useReceiptSettings();

  const form = useForm<ReceiptSettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: receiptSettings,
  });

  // Update form defaults if receiptSettings change from context
  useEffect(() => {
    form.reset(receiptSettings);
  }, [receiptSettings, form]);

  const onSubmit = (values: ReceiptSettingsFormValues) => {
    updateReceiptSettings(values);
    toast.success("Receipt settings updated successfully!");
  };

  return (
    <ShadcnForm {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="storeName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Store Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., ClassicPOS Store" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="storeAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Store Address</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 123 Main St, Anytown, USA" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="storePhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Store Phone</FormLabel>
              <FormControl>
                <Input placeholder="e.g., (555) 123-4567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="storeWebsite"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Store Website (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., www.classicpos.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="logoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/logo.png" {...field} value={field.value || ""} />
              </FormControl>
              <FormDescription>
                URL to your store's logo, displayed at the top of the receipt.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="thankYouMessage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Thank You Message</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Thank you for your purchase!" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-semibold">Display Options</h3>
          <FormField
            control={form.control}
            name="showSku"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Show SKU</FormLabel>
                  <FormDescription>
                    Display product SKU on the receipt.
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
            name="showCategory"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Show Category</FormLabel>
                  <FormDescription>
                    Display product category on the receipt.
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
            name="showCustomerInfo"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Show Customer Info</FormLabel>
                  <FormDescription>
                    Display customer name and email on the receipt if available.
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
            name="showVatTin"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Show VAT/TIN Numbers</FormLabel>
                  <FormDescription>
                    Display customer's VAT and TIN numbers on the receipt if available.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!form.watch("showCustomerInfo")}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full">Save Receipt Settings</Button>
      </form>
    </ShadcnForm>
  );
};

export default ReceiptSettingsForm;