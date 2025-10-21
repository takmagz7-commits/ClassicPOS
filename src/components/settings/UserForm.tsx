"use client";

import { useEffect } from "react";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, UserRole, UserStatus } from "@/types/user";

interface UserFormProps {
  initialUser?: User;
  onUserSubmit: (values: any) => Promise<boolean>;
  onClose: () => void;
}

const UserForm = ({ initialUser, onUserSubmit, onClose }: UserFormProps) => {
  const isEditMode = !!initialUser;

  const formSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: isEditMode
      ? z.string().min(6, { message: "New password must be at least 6 characters." }).optional().or(z.literal(""))
      : z.string().min(6, { message: "Password must be at least 6 characters." }),
    role: z.nativeEnum(UserRole, { message: "Please select a valid role." }),
    fullName: z.string().min(1, { message: "Full name is required." }),
    department: z.string().optional(),
    jobTitle: z.string().optional(),
    salary: z.number().min(0, { message: "Salary must be a positive number." }).optional(),
    pinCode: z.string().min(4, { message: "PIN must be at least 4 digits." }).max(6, { message: "PIN must be at most 6 digits." }).optional().or(z.literal("")),
    status: z.nativeEnum(UserStatus).optional(),
    phone: z.string().optional(),
  });

  type UserFormValues = z.infer<typeof formSchema>;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: initialUser?.email || "",
      role: initialUser?.role || UserRole.EMPLOYEE,
      password: "",
      fullName: initialUser?.fullName || "",
      department: initialUser?.department || "",
      jobTitle: initialUser?.jobTitle || "",
      salary: initialUser?.salary || 0,
      pinCode: initialUser?.pinCode || "",
      status: initialUser?.status || UserStatus.ACTIVE,
      phone: initialUser?.phone || "",
    },
  });

  useEffect(() => {
    if (initialUser) {
      form.reset({
        email: initialUser.email,
        role: initialUser.role,
        password: "",
        fullName: initialUser.fullName || "",
        department: initialUser.department || "",
        jobTitle: initialUser.jobTitle || "",
        salary: initialUser.salary || 0,
        pinCode: initialUser.pinCode || "",
        status: initialUser.status || UserStatus.ACTIVE,
        phone: initialUser.phone || "",
      });
    } else {
      form.reset({
        email: "",
        role: UserRole.EMPLOYEE,
        password: "",
        fullName: "",
        department: "",
        jobTitle: "",
        salary: 0,
        pinCode: "",
        status: UserStatus.ACTIVE,
        phone: "",
      });
    }
  }, [initialUser, form]);

  const onSubmit = async (values: UserFormValues) => {
    const success = await onUserSubmit(values);
    if (success) {
      onClose();
      form.reset();
    }
  };

  return (
    <ShadcnForm {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input placeholder="user@example.com" {...field} disabled={!!initialUser} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
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
              <FormLabel>{isEditMode ? "New Password (optional)" : "Password *"}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={isEditMode ? "Leave blank to keep current" : "Enter password"} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(UserRole).map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
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
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Sales, IT, HR" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="jobTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Cashier, Manager" {...field} />
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
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="+1 234 567 8900" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="salary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Base Salary</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>Monthly base salary amount</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pinCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PIN Code</FormLabel>
              <FormControl>
                <Input type="password" placeholder="4-6 digit PIN" maxLength={6} {...field} />
              </FormControl>
              <FormDescription>Used for quick POS login</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(UserStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          {isEditMode ? "Save Changes" : "Add User"}
        </Button>
      </form>
    </ShadcnForm>
  );
};

export default UserForm;
