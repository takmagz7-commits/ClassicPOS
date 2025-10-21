"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Product } from "@/types/product";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Boxes } from "lucide-react";

interface LowStockProductsProps {
  products: Product[];
}

const LOW_STOCK_THRESHOLD = 10;

const LowStockProducts = ({ products }: LowStockProductsProps) => {
  const lowStockProducts = products
    .filter((product) => product.stock <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.stock - b.stock);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Low Stock Products</CardTitle>
        <CardDescription>
          Products with {LOW_STOCK_THRESHOLD} or fewer items in stock.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {lowStockProducts.length > 0 ? (
            <div className="space-y-4">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <Link to="/products" className="text-sm font-medium leading-none hover:underline">
                      {product.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      SKU: {product.sku}
                    </p>
                  </div>
                  <div className="ml-auto font-medium">
                    <Badge variant="destructive">Stock: {product.stock}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Boxes className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">All products are well-stocked!</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LowStockProducts;