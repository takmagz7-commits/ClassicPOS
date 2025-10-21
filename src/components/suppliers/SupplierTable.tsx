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
import { Supplier } from "@/types/supplier";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

interface SupplierTableProps {
  suppliers: Supplier[];
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplier: Supplier) => void;
}

const SupplierTable = ({ suppliers, onEditSupplier, onDeleteSupplier }: SupplierTableProps) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact Person</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>VAT Number</TableHead> {/* New TableHead */}
            <TableHead>TIN Number</TableHead> {/* New TableHead */}
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.length > 0 ? (
            suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>{supplier.contactPerson || "N/A"}</TableCell>
                <TableCell>{supplier.email || "N/A"}</TableCell>
                <TableCell>{supplier.phone || "N/A"}</TableCell>
                <TableCell>{supplier.address || "N/A"}</TableCell>
                <TableCell>{supplier.vatNumber || "N/A"}</TableCell> {/* New TableCell */}
                <TableCell>{supplier.tinNumber || "N/A"}</TableCell> {/* New TableCell */}
                <TableCell className="text-center flex justify-center items-center space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => onEditSupplier(supplier)}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDeleteSupplier(supplier)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center"> {/* Updated colspan */}
                No suppliers found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default SupplierTable;