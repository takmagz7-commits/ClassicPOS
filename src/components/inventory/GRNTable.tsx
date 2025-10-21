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
import { GoodsReceivedNote, GRNStatus } from "@/types/inventory";
import { Edit, Trash2, Eye, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface GRNTableProps {
  grns: GoodsReceivedNote[];
  onViewDetails: (grn: GoodsReceivedNote) => void;
  onEditGRN: (grn: GoodsReceivedNote) => void;
  onDeleteGRN: (grn: GoodsReceivedNote) => void;
  onApproveGRN: (grnId: string) => void;
}

const GRNTable = ({ grns, onViewDetails, onEditGRN, onDeleteGRN, onApproveGRN }: GRNTableProps) => {
  const { currentCurrency } = useCurrency();

  const getStatusBadgeVariant = (status: GRNStatus) => {
    switch (status) {
      case "approved":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
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
            <TableHead>Receiving Store</TableHead>
            <TableHead>Received Date</TableHead>
            <TableHead className="text-right">Total Value</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grns.length > 0 ? (
            grns.map((grn) => (
              <TableRow key={grn.id}>
                <TableCell className="font-medium">{grn.referenceNo}</TableCell>
                <TableCell>{grn.supplierName || "Unknown Supplier"}</TableCell> {/* Use denormalized supplierName */}
                <TableCell>{grn.receivingStoreName || "Unknown Store"}</TableCell> {/* Use denormalized receivingStoreName */}
                <TableCell>{format(new Date(grn.receivedDate), "MMM dd, yyyy")}</TableCell>
                <TableCell className="text-right">{formatCurrency(grn.totalValue, currentCurrency)}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={getStatusBadgeVariant(grn.status)}>{grn.status}</Badge>
                </TableCell>
                <TableCell className="text-center flex justify-center items-center space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => onViewDetails(grn)}>
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View Details</span>
                  </Button>
                  {grn.status === "pending" && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => onEditGRN(grn)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onApproveGRN(grn.id)}>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="sr-only">Approve GRN</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDeleteGRN(grn)}>
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
                No Goods Received Notes found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default GRNTable;