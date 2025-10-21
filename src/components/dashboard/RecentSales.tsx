"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSales } from "@/context/SaleContext";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const RecentSales = () => {
  const { salesHistory } = useSales();
  const { currentCurrency } = useCurrency();

  const recentSales = salesHistory
    .filter(sale => sale.type === 'sale') // Only show sales, not refunds
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

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
        <CardTitle>Recent Sales</CardTitle>
        <CardDescription>
          The last 5 sales made.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recentSales.length > 0 ? (
          <div className="space-y-4">
            {recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>
                    {sale.customerName ? getInitials(sale.customerName) : <ShoppingCart className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {sale.customerName || "Walk-in Customer"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sale ID: {sale.id.substring(0, 8)}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-medium">{formatCurrency(sale.total, currentCurrency)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(sale.date), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No recent sales to display.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentSales;