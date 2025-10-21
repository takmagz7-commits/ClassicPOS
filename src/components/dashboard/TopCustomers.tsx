"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSales } from "@/context/SaleContext";
import { useCustomers } from "@/context/CustomerContext";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";

const TopCustomers = () => {
  const { salesHistory } = useSales();
  const { customers } = useCustomers();
  const { currentCurrency } = useCurrency();

  const topCustomers = useMemo(() => {
    const customerSpending = new Map<string, number>();

    salesHistory
      .filter(sale => sale.type === 'sale' && sale.customerId)
      .forEach(sale => {
        customerSpending.set(
          sale.customerId!,
          (customerSpending.get(sale.customerId!) || 0) + sale.total
        );
      });

    return Array.from(customerSpending.entries())
      .map(([customerId, totalSpent]) => {
        const customer = customers.find(c => c.id === customerId);
        return {
          ...customer,
          totalSpent,
        };
      })
      .filter(c => c.id) // Filter out any cases where customer wasn't found
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
  }, [salesHistory, customers]);

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0]?.toUpperCase() || "C";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Customers</CardTitle>
        <CardDescription>
          Top 5 customers by total spending.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {topCustomers.length > 0 ? (
          <div className="space-y-4">
            {topCustomers.map((customer) => (
              <div key={customer.id} className="flex items-center">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{getInitials(customer.name!)}</AvatarFallback>
                </Avatar>
                <div className="ml-4 space-y-1">
                  <Link to={`/customers/${customer.id}`} className="text-sm font-medium leading-none hover:underline">
                    {customer.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                </div>
                <div className="ml-auto font-medium">{formatCurrency(customer.totalSpent, currentCurrency)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No customer sales data available.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopCustomers;