"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { useSuppliers } from "@/context/SupplierContext";
import { Supplier } from "@/types/supplier";
import SupplierTable from "@/components/suppliers/SupplierTable";
import SupplierUpsertForm from "@/components/suppliers/SupplierUpsertForm";
import DeleteSupplierDialog from "@/components/suppliers/DeleteSupplierDialog";
import { toast } from "sonner";
import ExportSuppliersDataButton from "@/components/suppliers/ExportSuppliersDataButton"; // New import

const Suppliers = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  const handleSupplierSubmit = (supplierData: Omit<Supplier, "id"> | Supplier) => {
    if ('id' in supplierData) {
      updateSupplier(supplierData);
    } else {
      addSupplier(supplierData);
    }
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsEditDialogOpen(true);
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setDeletingSupplier(supplier);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteSupplier = (supplierId: string) => {
    deleteSupplier(supplierId);
    toast.success("Supplier deleted successfully!");
    setDeletingSupplier(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Supplier Management</h1>
        <div className="flex items-center gap-2">
          <ExportSuppliersDataButton suppliers={suppliers} filename="supplier_list" /> {/* New Export Button */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
              </DialogHeader>
              <SupplierUpsertForm onSupplierSubmit={handleSupplierSubmit} onClose={() => setIsAddDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier List</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierTable
            suppliers={suppliers}
            onEditSupplier={handleEditSupplier}
            onDeleteSupplier={handleDeleteSupplier}
          />
        </CardContent>
      </Card>

      {editingSupplier && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Supplier</DialogTitle>
            </DialogHeader>
            <SupplierUpsertForm
              initialSupplier={editingSupplier}
              onSupplierSubmit={handleSupplierSubmit}
              onClose={() => setIsEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {deletingSupplier && (
        <DeleteSupplierDialog
          supplier={deletingSupplier}
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={confirmDeleteSupplier}
        />
      )}
    </div>
  );
};

export default Suppliers;