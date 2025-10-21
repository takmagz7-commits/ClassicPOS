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
import { InventoryHistoryEntry, InventoryHistoryType } from "@/types/inventory";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Package, ShoppingCart, RefreshCcw, User, Store, Tag } from "lucide-react";

interface InventoryHistoryTableProps {
  history: InventoryHistoryEntry[];
}

const InventoryHistoryTable = ({ history }: InventoryHistoryTableProps) => {

  const getTypeBadgeVariant = (type: InventoryHistoryType) => {
    switch (type) {
      case InventoryHistoryType.GRN:
      case InventoryHistoryType.SA_INCREASE:
      case InventoryHistoryType.TOG_IN:
      case InventoryHistoryType.INITIAL_STOCK:
        return "default"; // Greenish/positive
      case InventoryHistoryType.SALE:
      case InventoryHistoryType.REFUND:
      case InventoryHistoryType.SA_DECREASE:
      case InventoryHistoryType.TOG_OUT:
        return "destructive"; // Reddish/negative
      case InventoryHistoryType.PRODUCT_EDIT:
        return "secondary"; // Neutral
      default:
        return "outline";
    }
  };

  const getQuantityChangeIcon = (quantityChange?: number) => {
    if (quantityChange === undefined || quantityChange === 0) return null;
    if (quantityChange > 0) {
      return <ArrowUp className="h-4 w-4 text-green-600" />;
    }
    return <ArrowDown className="h-4 w-4 text-red-600" />;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-center">Qty Change</TableHead>
            <TableHead className="text-right">Current Stock</TableHead>
            <TableHead>Store</TableHead>
            <TableHead>User</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.length > 0 ? (
            history.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{format(new Date(entry.date), "MMM dd, yyyy HH:mm")}</TableCell>
                <TableCell>
                  <Badge variant={getTypeBadgeVariant(entry.type)}>{entry.type}</Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{entry.description}</TableCell>
                <TableCell>{entry.productName || "N/A"}</TableCell>
                <TableCell className="text-center flex items-center justify-center gap-1">
                  {getQuantityChangeIcon(entry.quantityChange)}
                  {entry.quantityChange !== undefined ? Math.abs(entry.quantityChange) : "N/A"}
                </TableCell>
                <TableCell className="text-right">{entry.currentStock !== undefined ? entry.currentStock : "N/A"}</TableCell>
                <TableCell>{entry.storeName || "N/A"}</TableCell>
                <TableCell>{entry.userName || "System"}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No inventory history found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default InventoryHistoryTable;