"use client";

import React from "react";
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
import { Switch } from "@/components/ui/switch";
import { useLoyaltySettings } from "@/context/LoyaltySettingsContext";
import { toast } from "sonner";

const formSchema = z.object({
  isLoyaltyEnabled: z.boolean(),
});

type LoyaltySettingsFormValues = z.infer<typeof formSchema>;

const LoyaltySettingsForm = () => {
  const { isLoyaltyEnabled, toggleLoyaltyEnabled } = useLoyaltySettings();

  const form = useForm<LoyaltySettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isLoyaltyEnabled: isLoyaltyEnabled,
    },
  });

  // Update form default if context value changes
  React.useEffect(() => {
    form.reset({ isLoyaltyEnabled });
  }, [isLoyaltyEnabled, form]);

  const onSubmit = (values: LoyaltySettingsFormValues) => {
    toggleLoyaltyEnabled(values.isLoyaltyEnabled);
    toast.success(`Loyalty program ${values.isLoyaltyEnabled ? "enabled" : "disabled"} successfully!`);
  };

  return (
    <ShadcnForm {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="isLoyaltyEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Loyalty Program</FormLabel>
                <FormDescription>
                  Toggle to enable or disable customer loyalty points earning and redemption.
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
        <Button type="submit" className="w-full">Save Loyalty Settings</Button>
      </form>
    </ShadcnForm>
  );
};

export default LoyaltySettingsForm;