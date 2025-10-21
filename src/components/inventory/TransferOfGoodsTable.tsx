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
import { TransferOfGoods, TransferStatus } from "@/types/inventory";
import { Edit, Trash2, Eye, CheckCircle2, Truck, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface TransferOfGoodsTableProps {
  transfers: TransferOfGoods[];
  onViewDetails: (transfer: TransferOfGoods) => void;
  onEditTransfer: (transfer: TransferOfGoods) => void;
  onDeleteTransfer: (transfer: TransferOfGoods) => void;
  onUpdateTransferStatus: (transferId: string, status: TransferStatus) => void;
}

const TransferOfGoodsTable = ({ transfers, onViewDetails, onEditTransfer, onDeleteTransfer, onUpdateTransferStatus }: TransferOfGoodsTableProps) => {

  const getStatusBadgeVariant = (status: TransferStatus) => {
    switch (status) {
      case "received":
        return "default";
      case "in-transit":
        return "secondary";
      case "pending":
        return "outline";
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
            <TableHead>Transfer ID</TableHead>
            <TableHead>From Store</TableHead>
            <TableHead>To Store</TableHead>
            <TableHead>Transfer Date</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.length > 0 ? (
            transfers.map((transfer) => (
              <TableRow key={transfer.id}>
                <TableCell className="font-medium">{transfer.id.substring(0, 8)}</TableCell>
                <TableCell>{transfer.transferFromStoreName || "Unknown Store"}</TableCell> {/* Display full store name */}
                <TableCell>{transfer.transferToStoreName || "Unknown Store"}</TableCell> {/* Display full store name */}
                <TableCell>{format(new Date(transfer.transferDate), "MMM dd, yyyy")}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={getStatusBadgeVariant(transfer.status)}>{transfer.status}</Badge>
                </TableCell>
                <TableCell className="text-center flex justify-center items-center space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => onViewDetails(transfer)}>
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View Details</span>
                  </Button>
                  {transfer.status === "pending" && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => onEditTransfer(transfer)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onUpdateTransferStatus(transfer.id, "in-transit")}>
                        <Truck className="h-4 w-4 text-blue-600" />
                        <span className="sr-only">Mark In Transit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onUpdateTransferStatus(transfer.id, "rejected")}>
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Reject Transfer</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDeleteTransfer(transfer)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </>
                  )}
                  {transfer.status === "in-transit" && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => onUpdateTransferStatus(transfer.id, "received")}>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="sr-only">Mark Received</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onUpdateTransferStatus(transfer.id, "rejected")}>
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Reject Transfer</span>
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No transfers of goods found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransferOfGoodsTable;