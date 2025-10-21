"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Customer } from "@/types/customer";

interface CustomerSelectorProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelectCustomer: (customerId: string | null) => void;
}

const CustomerSelector = ({ customers, selectedCustomerId, onSelectCustomer }: CustomerSelectorProps) => {
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Customer</CardTitle>
      </CardHeader>
      <CardContent>
        <Label htmlFor="customer-select" className="sr-only">Select a customer</Label>
        <Select
          value={selectedCustomerId || ""}
          onValueChange={(value) => onSelectCustomer(value === "none" ? null : value)}
        >
          <SelectTrigger id="customer-select">
            <SelectValue placeholder="Select a customer (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Customer (Walk-in)</SelectItem>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name} ({customer.email}) - {customer.loyaltyPoints} pts
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCustomer && (
          <p className="text-sm text-muted-foreground mt-2">
            Available Loyalty Points: <span className="font-medium">{selectedCustomer.loyaltyPoints}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerSelector;