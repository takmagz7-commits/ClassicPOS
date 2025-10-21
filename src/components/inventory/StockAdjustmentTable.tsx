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
import { Button } from "@/components/ui/button";
import { StockAdjustment, AdjustmentType } from "@/types/inventory";
import { Edit, Trash2, Eye, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface StockAdjustmentTableProps {
  stockAdjustments: StockAdjustment[];
  onViewDetails: (adjustment: StockAdjustment) => void;
  onEditAdjustment: (adjustment: StockAdjustment) => void;
  onDeleteAdjustment: (adjustment: StockAdjustment) => void;
}

const StockAdjustmentTable = ({ stockAdjustments, onViewDetails, onEditAdjustment, onDeleteAdjustment }: StockAdjustmentTableProps) => {

  const getAdjustmentTypeIcon = (type: AdjustmentType) => {
    if (type === AdjustmentType.Increase) {
      return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
    }
    return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
  };

  const getAdjustmentTypeBadgeVariant = (type: AdjustmentType) => {
    if (type === AdjustmentType.Increase) {
      return "default";
    }
    return "destructive";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Adjustment ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Store</TableHead>
            <TableHead>Items Adjusted</TableHead>
            <TableHead>Approved By</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stockAdjustments.length > 0 ? (
            stockAdjustments.map((adjustment) => (
              <TableRow key={adjustment.id}>
                <TableCell className="font-medium">{adjustment.id.substring(0, 8)}</TableCell>
                <TableCell>{format(new Date(adjustment.adjustmentDate), "MMM dd, yyyy")}</TableCell>
                <TableCell>{adjustment.storeName || "N/A"}</TableCell>
                <TableCell>
                  {adjustment.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-1 text-sm text-muted-foreground">
                      {getAdjustmentTypeIcon(item.adjustmentType)}
                      <Badge variant={getAdjustmentTypeBadgeVariant(item.adjustmentType)}>
                        {item.adjustmentType === AdjustmentType.Increase ? "+" : "-"}
                        {item.quantity}
                      </Badge>
                      <span>{item.productName || "Unknown Product"}</span>
                    </div>
                  ))}
                </TableCell>
                <TableCell>{adjustment.approvedByUserName || "N/A"}</TableCell>
                <TableCell className="text-center flex justify-center items-center space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => onViewDetails(adjustment)}>
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View Details</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEditAdjustment(adjustment)}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDeleteAdjustment(adjustment)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No stock adjustments found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default StockAdjustmentTable;