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
import { Customer } from "@/types/customer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

interface CustomerTableProps {
  customers: Customer[];
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
}

const CustomerTable = ({ customers, onEditCustomer, onDeleteCustomer }: CustomerTableProps) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>VAT Number</TableHead> {/* New TableHead */}
            <TableHead>TIN Number</TableHead> {/* New TableHead */}
            <TableHead className="text-right">Loyalty Points</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length > 0 ? (
            customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">
                  <Link to={`/customers/${customer.id}`} className="hover:underline">
                    {customer.name}
                  </Link>
                </TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.phone || "N/A"}</TableCell>
                <TableCell>{customer.address || "N/A"}</TableCell>
                <TableCell>{customer.vatNumber || "N/A"}</TableCell> {/* New TableCell */}
                <TableCell>{customer.tinNumber || "N/A"}</TableCell> {/* New TableCell */}
                <TableCell className="text-right">{customer.loyaltyPoints}</TableCell>
                <TableCell className="text-center flex justify-center items-center space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => onEditCustomer(customer)}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDeleteCustomer(customer)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center"> {/* Updated colspan */}
                No customers found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default CustomerTable;