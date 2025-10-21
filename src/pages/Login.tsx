"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Link } from "react-router-dom";
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

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
  totpCode: z.string().optional(),
  backupCode: z.string().optional(),
});

const pinLoginSchema = z.object({
  pinCode: z.string().min(4, { message: "PIN must be at least 4 digits." }).max(6, { message: "PIN must be at most 6 digits." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type PinLoginFormValues = z.infer<typeof pinLoginSchema>;

const Login = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mfaRequired, setMfaRequired] = useState<boolean>(false);
  const [useBackupCode, setUseBackupCode] = useState<boolean>(false);
  const { login, pinLogin } = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      totpCode: "",
      backupCode: "",
    },
  });

  const pinForm = useForm<PinLoginFormValues>({
    resolver: zodResolver(pinLoginSchema),
    defaultValues: {
      pinCode: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setMfaRequired(false);

    const result = await login(
      values.email, 
      values.password, 
      useBackupCode ? undefined : values.totpCode, 
      useBackupCode ? values.backupCode : undefined
    );
    setIsLoading(false);

    if (!result.success) {
      if (result.mfaRequired) {
        setMfaRequired(true);
      }
    }
  };

  const onPinSubmit = async (values: PinLoginFormValues) => {
    setIsLoading(true);
    await pinLogin(values.pinCode);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">ClassicPOS</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email/Password</TabsTrigger>
              <TabsTrigger value="pin">PIN Login</TabsTrigger>
            </TabsList>
            
            <TabsContent value="email">
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
                            placeholder="admin@example.com"
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
                            placeholder="password"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {mfaRequired && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="mfa-code">
                          {useBackupCode ? "Backup Code" : "Authenticator Code"}
                        </Label>
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => setUseBackupCode(!useBackupCode)}
                          className="p-0 h-auto"
                          disabled={isLoading}
                        >
                          {useBackupCode ? "Use Authenticator App" : "Use Backup Code"}
                        </Button>
                      </div>
                      {useBackupCode ? (
                        <FormField
                          control={form.control}
                          name="backupCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  id="mfa-code"
                                  type="text"
                                  placeholder="Enter backup code"
                                  disabled={isLoading}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name="totpCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  id="mfa-code"
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  maxLength={6}
                                  placeholder="Enter 6-digit code"
                                  disabled={isLoading}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </ShadcnForm>
            </TabsContent>
            
            <TabsContent value="pin">
              <ShadcnForm {...pinForm}>
                <form onSubmit={pinForm.handleSubmit(onPinSubmit)} className="space-y-4">
                  <FormField
                    control={pinForm.control}
                    name="pinCode"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="pinCode" className="text-center block mb-4">
                          Enter your PIN
                        </Label>
                        <FormControl>
                          <div className="flex justify-center">
                            <InputOTP
                              maxLength={6}
                              value={field.value}
                              onChange={field.onChange}
                              disabled={isLoading}
                            >
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                        </FormControl>
                        <FormMessage className="text-center" />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login with PIN"}
                  </Button>
                </form>
              </ShadcnForm>
            </TabsContent>
          </Tabs>
          
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
