"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { useStores } from "@/context/StoreContext";
import { Store } from "@/types/store";
import StoreTable from "@/components/stores/StoreTable";
import StoreUpsertForm from "@/components/stores/StoreUpsertForm";
import DeleteStoreDialog from "@/components/stores/DeleteStoreDialog";

const Stores = () => {
  const { stores, addStore, updateStore, deleteStore } = useStores();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [deletingStore, setDeletingStore] = useState<Store | null>(null);

  const handleStoreSubmit = (storeData: Omit<Store, "id"> | Store) => {
    if ('id' in storeData) {
      updateStore(storeData);
    } else {
      addStore(storeData);
    }
  };

  const handleEditStore = (store: Store) => {
    setEditingStore(store);
    setIsEditDialogOpen(true);
  };

  const handleDeleteStore = (store: Store) => {
    setDeletingStore(store);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteStore = (storeId: string) => {
    deleteStore(storeId);
    setDeletingStore(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Multi-Store Management</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Store
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Store</DialogTitle>
            </DialogHeader>
            <StoreUpsertForm onStoreSubmit={handleStoreSubmit} onClose={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stores Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <StoreTable
            stores={stores}
            onEditStore={handleEditStore}
            onDeleteStore={handleDeleteStore}
          />
        </CardContent>
      </Card>

      {editingStore && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Store</DialogTitle>
            </DialogHeader>
            <StoreUpsertForm
              initialStore={editingStore}
              onStoreSubmit={handleStoreSubmit}
              onClose={() => setIsEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {deletingStore && (
        <DeleteStoreDialog
          store={deletingStore}
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={confirmDeleteStore}
        />
      )}
    </div>
  );
};

export default Stores;