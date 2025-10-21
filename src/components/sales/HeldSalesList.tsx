"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sale } from "@/types/sale";
import { useSales } from "@/context/SaleContext";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { Play, Trash2, ShoppingCart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface HeldSalesListProps {
  onResumeSale: (sale: Sale) => void;
}

const HeldSalesList = ({ onResumeSale }: HeldSalesListProps) => {
  const { heldSales, removeHeldSale } = useSales();
  const { currentCurrency } = useCurrency();

  const handleRemove = (saleId: string) => {
    removeHeldSale(saleId);
  };

  return (
    <Card className="flex-1 flex flex-col">
      <CardHeader>
        <CardTitle>Held Sales</CardTitle>
        <CardDescription>
          Transactions paused for later.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          {heldSales.length > 0 ? (
            <div className="space-y-4 pr-4">
              {heldSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Sale ID: {sale.id.substring(0, 8)}
                    </p>
                    {sale.customerName && (
                      <p className="text-xs text-muted-foreground">
                        Customer: {sale.customerName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Total: {formatCurrency(sale.total, currentCurrency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Held {formatDistanceToNow(new Date(sale.date), { addSuffix: true })}
                      {sale.heldByEmployeeName && ` by ${sale.heldByEmployeeName}`}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => onResumeSale(sale)}>
                      <Play className="h-4 w-4 mr-2" /> Resume
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleRemove(sale.id)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No sales currently on hold.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default HeldSalesList;