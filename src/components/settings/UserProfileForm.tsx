"use client";

import React, { useEffect, useState } from "react";
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
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockBusinessTypes } from "@/data/mockBusinessTypes";
import { mockCountries } from "@/data/mockCountries";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }).optional().or(z.literal("")),
  confirmNewPassword: z.string().optional(),
  businessName: z.string().min(1, { message: "Business name is required." }).optional().or(z.literal("")),
  businessType: z.string().min(1, { message: "Please select a business type." }).optional().or(z.literal("")),
  country: z.string().min(1, { message: "Please select a country." }).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  vatNumber: z.string().optional().or(z.literal("")),
  tinNumber: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.newPassword && data.newPassword !== data.confirmNewPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "New passwords do not match.",
      path: ["confirmNewPassword"],
    });
  }
  if (data.newPassword && !data.currentPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Current password is required to change password.",
      path: ["currentPassword"],
    });
  }
});

type UserProfileFormValues = z.infer<typeof formSchema>;

const UserProfileForm = () => {
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UserProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: user?.email || "",
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
      businessName: user?.businessName || undefined,
      businessType: user?.businessType || undefined,
      country: user?.country || undefined,
      phone: user?.phone || undefined,
      vatNumber: user?.vatNumber || undefined,
      tinNumber: user?.tinNumber || undefined,
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        email: user.email,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
        businessName: user.businessName || undefined,
        businessType: user.businessType || undefined,
        country: user.country || undefined,
        phone: user.phone || undefined,
        vatNumber: user.vatNumber || undefined,
        tinNumber: user.tinNumber || undefined,
      });
    }
  }, [user, form]);

  const onSubmit = async (values: UserProfileFormValues) => {
    if (!user) return;

    setIsLoading(true);

    const updatedFields: Partial<typeof user> = {
      email: values.email,
      businessName: values.businessName || undefined,
      businessType: values.businessType || undefined,
      country: values.country || undefined,
      phone: values.phone || undefined,
      vatNumber: values.vatNumber || undefined,
      tinNumber: values.tinNumber || undefined,
    };

    const success = await updateUser(
      user.id,
      updatedFields,
      values.currentPassword || undefined,
      values.newPassword || undefined
    );

    setIsLoading(false);
    if (success) {
      toast.success("Profile updated successfully!");
      form.reset({
        email: values.email,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
        businessName: values.businessName || undefined,
        businessType: values.businessType || undefined,
        country: values.country || undefined,
        phone: values.phone || undefined,
        vatNumber: values.vatNumber || undefined,
        tinNumber: values.tinNumber || undefined,
      });
    } else {
      // Error message is already handled by AuthContext
    }
  };

  return (
    <ShadcnForm {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="your@example.com" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., My Awesome Store" disabled={isLoading} {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="businessType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a business type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {mockBusinessTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
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
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {mockCountries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
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
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number (Optional)</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="e.g., +15551234567" disabled={isLoading} {...field} value={field.value || ""} />
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
                <Input placeholder="e.g., GB123456789" disabled={isLoading} {...field} value={field.value || ""} />
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
                <Input placeholder="e.g., 123-456-789" disabled={isLoading} {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter current password" {...field} disabled={isLoading} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password (optional)</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Leave blank to keep current" {...field} disabled={isLoading} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmNewPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Confirm new password" {...field} disabled={isLoading} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Profile Changes"}
        </Button>
      </form>
    </ShadcnForm>
  );
};

export default UserProfileForm;