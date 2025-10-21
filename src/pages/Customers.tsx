"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Customer } from "@/types/customer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CustomerTable from "@/components/customers/CustomerTable";
import CustomerUpsertForm from "@/components/customers/CustomerUpsertForm";
import { PlusCircle } from "lucide-react";
import { useCustomers } from "@/context/CustomerContext";
import DeleteCustomerDialog from "@/components/customers/DeleteCustomerDialog";
import { toast } from "sonner";
import ExportCustomersDataButton from "@/components/customers/ExportCustomersDataButton"; // New import

const Customers = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsEditDialogOpen(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setDeletingCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteCustomer = (customerId: string) => {
    deleteCustomer(customerId);
    toast.success("Customer deleted successfully!");
    setDeletingCustomer(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Customers</h1>
        <div className="flex items-center gap-2">
          <ExportCustomersDataButton customers={customers} filename="customer_list" /> {/* New Export Button */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
              </DialogHeader>
              <CustomerUpsertForm onCustomerSubmit={addCustomer} onClose={() => setIsAddDialogOpen(false)} />
            </DialogContent>
          </Dialog>

          {editingCustomer && (
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Customer</DialogTitle>
                </DialogHeader>
                <CustomerUpsertForm
                  initialCustomer={editingCustomer}
                  onCustomerSubmit={(customer) => updateCustomer(customer.id, customer)}
                  onClose={() => setIsEditDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}

          {deletingCustomer && (
            <DeleteCustomerDialog
              customer={deletingCustomer}
              isOpen={isDeleteDialogOpen}
              onClose={() => setIsDeleteDialogOpen(false)}
              onConfirm={confirmDeleteCustomer}
            />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerTable
            customers={customers}
            onEditCustomer={handleEditCustomer}
            onDeleteCustomer={handleDeleteCustomer}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Customers;