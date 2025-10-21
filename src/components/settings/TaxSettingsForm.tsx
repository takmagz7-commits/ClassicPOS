"use client";

import React, { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { useTax } from "@/context/TaxContext";
import { TaxRate } from "@/types/tax";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit, PlusCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  name: z.string().min(1, { message: "Tax name is required." }),
  rate: z.coerce.number().min(0, { message: "Rate must be a non-negative number." }).max(100, { message: "Rate cannot exceed 100%." }),
  isDefault: z.boolean().optional(),
});

type TaxFormValues = z.infer<typeof formSchema>;

const TaxSettingsForm = () => {
  const { taxRates, defaultTaxRate, addTaxRate, updateTaxRate, deleteTaxRate, setDefaultTaxRate } = useTax();
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rateToDelete, setRateToDelete] = useState<TaxRate | null>(null);

  const form = useForm<TaxFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      rate: 0,
      isDefault: false,
    },
  });

  useEffect(() => {
    if (editingRate) {
      form.reset({
        name: editingRate.name,
        rate: editingRate.rate * 100,
        isDefault: editingRate.isDefault,
      });
    } else {
      form.reset({
        name: "",
        rate: 0,
        isDefault: false,
      });
    }
  }, [editingRate, form, isAddEditDialogOpen]);

  const onSubmit = (values: TaxFormValues) => {
    const rateValue = values.rate / 100;
    if (editingRate) {
      updateTaxRate({ ...editingRate, name: values.name, rate: rateValue, isDefault: values.isDefault || false });
    } else {
      addTaxRate({ name: values.name, rate: rateValue, isDefault: values.isDefault || false });
    }
    setIsAddEditDialogOpen(false);
  };

  const handleEditClick = (rate: TaxRate) => {
    setEditingRate(rate);
    setIsAddEditDialogOpen(true);
  };

  const handleDeleteClick = (rate: TaxRate) => {
    setRateToDelete(rate);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (rateToDelete) {
      if (rateToDelete.isDefault && taxRates.length > 1) {
        toast.error("Cannot delete the default tax rate if other rates exist. Please set another rate as default first.");
        setIsDeleteDialogOpen(false);
        setRateToDelete(null);
        return;
      }
      deleteTaxRate(rateToDelete.id);
      setIsDeleteDialogOpen(false);
      setRateToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Default Tax Rate</CardTitle>
        </CardHeader>
        <CardContent>
          {taxRates.length > 0 ? (
            <RadioGroup
              value={defaultTaxRate.id}
              onValueChange={setDefaultTaxRate}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {taxRates.map((rate) => (
                <div key={rate.id} className="flex items-center space-x-2 rounded-md border p-3">
                  <RadioGroupItem value={rate.id} id={`default-tax-${rate.id}`} />
                  <Label htmlFor={`default-tax-${rate.id}`} className="flex-1 cursor-pointer">
                    <span className="font-medium">{rate.name}</span>
                    <span className="text-muted-foreground ml-2">({(rate.rate * 100).toFixed(2)}%)</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <p className="text-muted-foreground">No tax rates available. Please add one.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manage Tax Rates</CardTitle>
          <Button onClick={() => { setEditingRate(null); setIsAddEditDialogOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Tax
          </Button>
        </CardHeader>
        <CardContent>
          {taxRates.length > 0 ? (
            <div className="space-y-2">
              {taxRates.map((rate) => (
                <div key={rate.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{rate.name}</p>
                    <p className="text-sm text-muted-foreground">{(rate.rate * 100).toFixed(2)}% {rate.isDefault && "(Default)"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(rate)}>
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(rate)} disabled={rate.isDefault && taxRates.length > 1}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No custom tax rates defined.</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{editingRate ? "Edit Tax Rate" : "Add New Tax Rate"}</AlertDialogTitle>
            <AlertDialogDescription>
              {editingRate ? "Modify the details of this tax rate." : "Add a new tax rate to your system."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ShadcnForm {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Sales Tax" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 8.00" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the tax rate as a percentage (e.g., 8 for 8%).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Set as Default</FormLabel>
                      <FormDescription>
                        This tax rate will be automatically applied to new sales.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={editingRate?.isDefault && taxRates.length === 1}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsAddEditDialogOpen(false)}>Cancel</AlertDialogCancel>
                <Button type="submit">{editingRate ? "Save Changes" : "Add Tax Rate"}</Button>
              </AlertDialogFooter>
            </form>
          </ShadcnForm>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the tax rate{" "}
              <span className="font-semibold text-foreground">"{rateToDelete?.name}"</span>.
              {rateToDelete?.isDefault && taxRates.length > 1 && (
                <p className="text-red-500 mt-2">
                  This is the default tax rate. You must set another rate as default before deleting this one.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={rateToDelete?.isDefault && taxRates.length > 1}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TaxSettingsForm;