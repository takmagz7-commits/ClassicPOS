"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSales } from "@/context/SaleContext";
import { useProducts } from "@/context/ProductContext";
import { useCategories } from "@/context/CategoryContext";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Boxes } from "lucide-react";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary-foreground))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--accent-foreground))",
  "hsl(var(--destructive))",
];

const CategorySalesChart = () => {
  const { salesHistory } = useSales();
  const { products } = useProducts();
  const { getCategoryName } = useCategories();
  const { currentCurrency } = useCurrency();

  const categorySalesData = useMemo(() => {
    const categorySalesMap = new Map<string, number>();

    salesHistory
      .filter(sale => sale.type === 'sale')
      .forEach(sale => {
        sale.items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const categoryName = getCategoryName(product.categoryId);
            const currentSales = categorySalesMap.get(categoryName) || 0;
            categorySalesMap.set(categoryName, currentSales + (item.price * item.quantity));
          }
        });
      });

    return Array.from(categorySalesMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [salesHistory, products, getCategoryName]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales by Category</CardTitle>
        <CardDescription>
          Distribution of sales across product categories.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {categorySalesData.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value, currentCurrency), "Sales"]}
                />
                <Legend />
                <Pie
                  data={categorySalesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {categorySalesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <Boxes className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No category sales data available.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategorySalesChart;