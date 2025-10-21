"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sale } from "@/types/sale";
import { format } from "date-fns";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Printer, Undo2, CheckCircle2 } from "lucide-react";
import { usePaymentMethods } from "@/context/PaymentMethodContext"; // New import
import { Badge } from "@/components/ui/badge"; // Import Badge for status

interface SalesTableProps {
  sales: Sale[];
  onViewReceipt: (sale: Sale) => void;
  onRefundSale: (sale: Sale) => void;
  onSettleCreditSale: (sale: Sale) => void;
}

const SalesTable = ({ sales, onViewReceipt, onRefundSale, onSettleCreditSale }: SalesTableProps) => {
  const { currentCurrency } = useCurrency();
  const { getPaymentMethodName } = usePaymentMethods(); // Use getPaymentMethodName from context

  const getStatusBadgeVariant = (status: Sale["status"]) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "on-hold":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sale ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-center">Payment Method</TableHead>
            <TableHead>Store</TableHead> {/* New TableHead */}
            <TableHead>Employee</TableHead>
            <TableHead>Held By</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Type</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.length > 0 ? (
            sales.map((sale) => (
              <TableRow key={sale.id} className={sale.type === "refund" ? "bg-red-50 dark:bg-red-950" : ""}>
                <TableCell className="font-medium">{sale.id.substring(0, 8)}</TableCell>
                <TableCell>{format(new Date(sale.date), "MMM dd, yyyy HH:mm")}</TableCell>
                <TableCell>
                  {sale.items.map((item) => (
                    <div key={item.productId} className="text-sm text-muted-foreground">
                      {item.quantity}x {item.name} ({formatCurrency(item.price, currentCurrency)})
                    </div>
                  ))}
                </TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(sale.total, currentCurrency)}</TableCell>
                <TableCell className="text-center capitalize">{sale.paymentMethodId ? getPaymentMethodName(sale.paymentMethodId) : "N/A"}</TableCell>
                <TableCell>{sale.storeName || "N/A"}</TableCell> {/* Display storeName */}
                <TableCell>{sale.employeeName || "N/A"}</TableCell>
                <TableCell>{sale.heldByEmployeeName || "N/A"}</TableCell>
                <TableCell className="text-center capitalize">
                  <Badge variant={getStatusBadgeVariant(sale.status)}>{sale.status}</Badge>
                </TableCell>
                <TableCell className="text-center capitalize">
                  <Badge variant={sale.type === "refund" ? "destructive" : "secondary"}>
                    {sale.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-center flex justify-center items-center space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => onViewReceipt(sale)}>
                    <Printer className="h-4 w-4" />
                    <span className="sr-only">View/Print Receipt</span>
                  </Button>
                  {sale.type === "sale" && sale.status === "completed" && (
                    <Button variant="ghost" size="icon" onClick={() => onRefundSale(sale)}>
                      <Undo2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Refund Sale</span>
                    </Button>
                  )}
                  {sale.type === "sale" && sale.status === "pending" && (
                    <Button variant="ghost" size="icon" onClick={() => onSettleCreditSale(sale)}>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="sr-only">Settle Credit Sale</span>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={11} className="h-24 text-center"> {/* Updated colspan */}
                No sales recorded yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default SalesTable;