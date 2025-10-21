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
import { usePaymentMethods } from "@/context/PaymentMethodContext";
import { PaymentMethod } from "@/types/payment";
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

const formSchema = z.object({
  name: z.string().min(1, { message: "Payment method name is required." }),
  isCashEquivalent: z.boolean().optional(),
  isCredit: z.boolean().optional(),
  isBNPL: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // Ensure at least one type is selected
  if (!data.isCashEquivalent && !data.isCredit && !data.isBNPL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one payment type (Cash/Card, Credit, BNPL) must be selected.",
      path: ["isCashEquivalent"], // Point to the first boolean field
    });
  }
});

type PaymentMethodFormValues = z.infer<typeof formSchema>;

const PaymentMethodSettingsForm = () => {
  const { paymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod } = usePaymentMethods();
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<PaymentMethod | null>(null);

  const form = useForm<PaymentMethodFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      isCashEquivalent: false,
      isCredit: false,
      isBNPL: false,
    },
  });

  useEffect(() => {
    if (editingMethod) {
      form.reset({
        name: editingMethod.name,
        isCashEquivalent: editingMethod.isCashEquivalent,
        isCredit: editingMethod.isCredit,
        isBNPL: editingMethod.isBNPL,
      });
    } else {
      form.reset({
        name: "",
        isCashEquivalent: false,
        isCredit: false,
        isBNPL: false,
      });
    }
  }, [editingMethod, form, isAddEditDialogOpen]);

  const onSubmit = (values: PaymentMethodFormValues) => {
    if (editingMethod) {
      updatePaymentMethod({ ...editingMethod, ...values });
    } else {
      addPaymentMethod(values as Omit<PaymentMethod, "id">); // Added type assertion
    }
    setIsAddEditDialogOpen(false);
  };

  const handleEditClick = (method: PaymentMethod) => {
    setEditingMethod(method);
    setIsAddEditDialogOpen(true);
  };

  const handleDeleteClick = (method: PaymentMethod) => {
    setMethodToDelete(method);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (methodToDelete) {
      deletePaymentMethod(methodToDelete.id);
      setIsDeleteDialogOpen(false);
      setMethodToDelete(null);
    }
  };

  // Removed isDefaultMethod check, all methods are now editable/deletable

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manage Payment Methods</CardTitle>
          <Button onClick={() => { setEditingMethod(null); setIsAddEditDialogOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Method
          </Button>
        </CardHeader>
        <CardContent>
          {paymentMethods.length > 0 ? (
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{method.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {method.isCashEquivalent && "Cash/Card "}
                      {method.isCredit && "Credit "}
                      {method.isBNPL && "BNPL "}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(method)}>
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(method)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No payment methods defined.</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{editingMethod ? "Edit Payment Method" : "Add New Payment Method"}</AlertDialogTitle>
            <AlertDialogDescription>
              {editingMethod ? "Modify the details of this payment method." : "Add a new payment method to your system."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ShadcnForm {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Store Credit" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <FormLabel>Payment Types</FormLabel>
                <FormField
                  control={form.control}
                  name="isCashEquivalent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Cash/Card Equivalent</FormLabel>
                        <FormDescription>
                          Treat as a direct payment method (e.g., Cash, Debit Card, Mobile Pay).
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
                  name="isCredit"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Credit Account</FormLabel>
                        <FormDescription>
                          Allows customers to pay later (e.g., Store Credit Account).
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
                  name="isBNPL"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Buy Now, Pay Later (BNPL)</FormLabel>
                        <FormDescription>
                          Integrates with BNPL services (e.g., Afterpay, Klarna).
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
                <FormMessage />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsAddEditDialogOpen(false)}>Cancel</AlertDialogCancel>
                <Button type="submit">{editingMethod ? "Save Changes" : "Add Payment Method"}</Button>
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
              This action cannot be undone. This will permanently delete the payment method{" "}
              <span className="font-semibold text-foreground">"{methodToDelete?.name}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PaymentMethodSettingsForm;