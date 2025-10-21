"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form as ShadcnForm,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockBusinessTypes } from "@/data/mockBusinessTypes";
import { mockCountries } from "@/data/mockCountries";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getApiBaseUrl } from "@/utils/platformConfig";

const API_BASE_URL = getApiBaseUrl();

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string().min(8, { message: "Password must be at least 8 characters." }),
  businessName: z.string().min(1, { message: "Business name is required." }),
  businessType: z.string().min(1, { message: "Please select a business type." }),
  country: z.string().min(1, { message: "Please select a country." }),
  phone: z.string().optional().or(z.literal("")),
  vatNumber: z.string().optional().or(z.literal("")),
  tinNumber: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    });
  }
});

type SignupFormValues = z.infer<typeof formSchema>;

const Signup = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [systemInitialized, setSystemInitialized] = useState<boolean>(false);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(true);
  const { register } = useAuth();

  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/system-status`);
        if (response.ok) {
          const data = await response.json();
          setSystemInitialized(data.initialized || false);
        }
      } catch (error) {
        console.error("Error checking system status:", error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkSystemStatus();
  }, []);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      businessName: "",
      businessType: "",
      country: "",
      phone: undefined,
      vatNumber: undefined,
      tinNumber: undefined,
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);

    await register(
      values.email,
      values.password,
      values.businessName,
      values.businessType,
      values.country,
      values.phone || undefined,
      values.vatNumber || undefined,
      values.tinNumber || undefined
    );
    setIsLoading(false);
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">ClassicPOS</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (systemInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">ClassicPOS</CardTitle>
            <CardDescription>System already configured</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Registration Disabled</AlertTitle>
              <AlertDescription>
                ClassicPOS is already configured. Please sign in with your admin credentials.
              </AlertDescription>
            </Alert>
            <Link to="/login" className="block">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">ClassicPOS</CardTitle>
          <CardDescription>Create your admin account</CardDescription>
        </CardHeader>
        <CardContent>
          <ShadcnForm {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="email">Email</Label>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@example.com"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="password">Password</Label>
                    <FormControl>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <FormControl>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm your password"
                        disabled={isLoading}
                        {...field}
                      />
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
                    <Label htmlFor="business-name">Business Name</Label>
                    <FormControl>
                      <Input
                        id="business-name"
                        placeholder="e.g., My Awesome Store"
                        disabled={isLoading}
                        {...field}
                        value={field.value || ""}
                      />
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
                    <Label htmlFor="business-type">Business Type</Label>
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger id="business-type">
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
                    <Label htmlFor="country">Country</Label>
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger id="country">
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
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <FormControl>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="e.g., +15551234567"
                        disabled={isLoading}
                        {...field}
                        value={field.value || ""}
                      />
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
                    <Label htmlFor="vat-number">VAT Number (Optional)</Label>
                    <FormControl>
                      <Input
                        id="vat-number"
                        placeholder="e.g., GB123456789"
                        disabled={isLoading}
                        {...field}
                        value={field.value || ""}
                      />
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
                    <Label htmlFor="tin-number">TIN Number (Optional)</Label>
                    <FormControl>
                      <Input
                        id="tin-number"
                        placeholder="e.g., 123-456-789"
                        disabled={isLoading}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Sign Up"}
              </Button>
            </form>
          </ShadcnForm>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;