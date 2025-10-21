"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PurchaseOrder, PurchaseOrderStatus } from "@/types/inventory";
import { Edit, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PurchaseOrderTableProps {
  purchaseOrders: PurchaseOrder[];
  onViewDetails: (order: PurchaseOrder) => void;
  onEditOrder: (order: PurchaseOrder) => void;
  onDeleteOrder: (order: PurchaseOrder) => void;
}

const PurchaseOrderTable = ({ purchaseOrders, onViewDetails, onEditOrder, onDeleteOrder }: PurchaseOrderTableProps) => {
  const { currentCurrency } = useCurrency();

  const getStatusBadgeVariant = (status: PurchaseOrderStatus) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
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
            <TableHead>Reference No.</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Order Date</TableHead>
            <TableHead>Expected Delivery</TableHead>
            <TableHead className="text-right">Total Value</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchaseOrders.length > 0 ? (
            purchaseOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.referenceNo}</TableCell>
                <TableCell>{order.supplierName || "Unknown Supplier"}</TableCell> {/* Use denormalized supplierName */}
                <TableCell>{format(new Date(order.orderDate), "MMM dd, yyyy")}</TableCell>
                <TableCell>{order.expectedDeliveryDate ? format(new Date(order.expectedDeliveryDate), "MMM dd, yyyy") : "N/A"}</TableCell>
                <TableCell className="text-right">{formatCurrency(order.totalValue, currentCurrency)}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                </TableCell>
                <TableCell className="text-center flex justify-center items-center space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => onViewDetails(order)}>
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View Details</span>
                  </Button>
                  {order.status === "pending" && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => onEditOrder(order)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDeleteOrder(order)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No purchase orders found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default PurchaseOrderTable;