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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePrinterSettings } from "@/context/PrinterSettingsContext";
import { toast } from "sonner";
import { PrinterSettings } from "@/types/printer";

const formSchema = z.object({
  printerName: z.string().min(1, { message: "Printer name is required." }),
  printerType: z.enum(["thermal", "inkjet", "laser", "dot-matrix"], {
    message: "Please select a valid printer type.",
  }),
  connectionType: z.enum(["usb", "network", "bluetooth"], {
    message: "Please select a valid connection type.",
  }),
  ipAddress: z.string().ip({ message: "Invalid IP address." }).optional().or(z.literal("")),
  port: z.coerce.number().int().min(1, { message: "Port must be a positive integer." }).optional(),
  bluetoothAddress: z.string().min(1, { message: "Bluetooth address is required." }).optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.connectionType === "network") {
    if (!data.ipAddress || data.ipAddress.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "IP Address is required for network connection.",
        path: ["ipAddress"],
      });
    }
    if (!data.port) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Port is required for network connection.",
        path: ["port"],
      });
    }
  }
  if (data.connectionType === "bluetooth" && (!data.bluetoothAddress || data.bluetoothAddress.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Bluetooth Address is required for bluetooth connection.",
      path: ["bluetoothAddress"],
    });
  }
});

type PrinterSettingsFormValues = z.infer<typeof formSchema>;

const PrinterSettingsForm = () => {
  const { printerSettings, updatePrinterSettings } = usePrinterSettings();

  const form = useForm<PrinterSettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: printerSettings,
  });

  // Update form defaults if printerSettings change from context
  useEffect(() => {
    form.reset(printerSettings);
  }, [printerSettings, form]);

  const onSubmit = (values: PrinterSettingsFormValues) => {
    updatePrinterSettings(values);
    toast.success("Printer settings updated successfully!");
  };

  const connectionType = form.watch("connectionType");

  return (
    <ShadcnForm {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="printerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Printer Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Main POS Printer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="printerType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Printer Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a printer type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="thermal">Thermal</SelectItem>
                  <SelectItem value="inkjet">Inkjet</SelectItem>
                  <SelectItem value="laser">Laser</SelectItem>
                  <SelectItem value="dot-matrix">Dot Matrix</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                The type of printer you are using.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="connectionType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Connection Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select connection type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="usb">USB</SelectItem>
                  <SelectItem value="network">Network (Ethernet/Wi-Fi)</SelectItem>
                  <SelectItem value="bluetooth">Bluetooth</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                How your printer is connected to the system.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {connectionType === "network" && (
          <>
            <FormField
              control={form.control}
              name="ipAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IP Address</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 192.168.1.100" {...field} />
                  </FormControl>
                  <FormDescription>
                    The IP address of your network printer.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Port</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 9100" {...field} />
                  </FormControl>
                  <FormDescription>
                    The port number for your network printer (commonly 9100).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {connectionType === "bluetooth" && (
          <FormField
            control={form.control}
            name="bluetoothAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bluetooth Address</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 00:11:22:33:44:55" {...field} />
                </FormControl>
                <FormDescription>
                  The MAC address of your Bluetooth printer.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full">Save Printer Settings</Button>
      </form>
    </ShadcnForm>
  );
};

export default PrinterSettingsForm;