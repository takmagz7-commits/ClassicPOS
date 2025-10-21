"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { useStockAdjustments } from "@/context/StockAdjustmentContext";
import { StockAdjustment, AdjustmentType } from "@/types/inventory";
import StockAdjustmentTable from "@/components/inventory/StockAdjustmentTable";
import StockAdjustmentUpsertForm from "@/components/inventory/StockAdjustmentUpsertForm";
import DeleteStockAdjustmentDialog from "@/components/inventory/DeleteStockAdjustmentDialog";
import { toast } from "sonner";
import { useStores } from "@/context/StoreContext";
import { useProducts } from "@/context/ProductContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const StockAdjustments = () => {
  const { stockAdjustments, addStockAdjustment, updateStockAdjustment, deleteStockAdjustment } = useStockAdjustments();
  const { stores } = useStores();
  const { products } = useProducts();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);

  const [editingAdjustment, setEditingAdjustment] = useState<StockAdjustment | null>(null);
  const [deletingAdjustment, setDeletingAdjustment] = useState<StockAdjustment | null>(null);
  const [viewingAdjustment, setViewingAdjustment] = useState<StockAdjustment | null>(null);

  const handleStockAdjustmentSubmit = (adjustmentData: Omit<StockAdjustment, "id" | "storeName" | "approvedByUserName" | "approvalDate"> | StockAdjustment) => {
    if ('id' in adjustmentData) {
      updateStockAdjustment(adjustmentData as StockAdjustment);
    } else {
      addStockAdjustment(adjustmentData as Omit<StockAdjustment, "id" | "storeName" | "approvedByUserName" | "approvalDate">);
    }
  };

  const handleViewDetails = (adjustment: StockAdjustment) => {
    setViewingAdjustment(adjustment);
    setIsViewDetailsDialogOpen(true);
  };

  const handleEditAdjustment = (adjustment: StockAdjustment) => {
    setEditingAdjustment(adjustment);
    setIsEditDialogOpen(true);
  };

  const handleDeleteAdjustment = (adjustment: StockAdjustment) => {
    setDeletingAdjustment(adjustment);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteAdjustment = (adjustmentId: string) => {
    deleteStockAdjustment(adjustmentId);
    toast.success("Stock Adjustment deleted successfully!");
    setDeletingAdjustment(null);
  };

  const getAdjustmentTypeBadgeVariant = (type: AdjustmentType) => {
    if (type === AdjustmentType.Increase) {
      return "default";
    }
    return "destructive";
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Stock Adjustments</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Adjustment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Stock Adjustment</DialogTitle>
            </DialogHeader>
            <StockAdjustmentUpsertForm onStockAdjustmentSubmit={handleStockAdjustmentSubmit} onClose={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Stock Adjustments</CardTitle>
        </CardHeader>
        <CardContent>
          <StockAdjustmentTable
            stockAdjustments={stockAdjustments}
            onViewDetails={handleViewDetails}
            onEditAdjustment={handleEditAdjustment}
            onDeleteAdjustment={handleDeleteAdjustment}
          />
        </CardContent>
      </Card>

      {editingAdjustment && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Stock Adjustment</DialogTitle>
            </DialogHeader>
            <StockAdjustmentUpsertForm
              initialStockAdjustment={editingAdjustment}
              onStockAdjustmentSubmit={handleStockAdjustmentSubmit}
              onClose={() => setIsEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {deletingAdjustment && (
        <DeleteStockAdjustmentDialog
          adjustment={deletingAdjustment}
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={confirmDeleteAdjustment}
        />
      )}

      {viewingAdjustment && (
        <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Stock Adjustment Details</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-sm">
              <div className="flex justify-between">
                <span>Adjustment ID:</span>
                <span className="font-medium">{viewingAdjustment.id.substring(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{format(new Date(viewingAdjustment.adjustmentDate), "MMM dd, yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span>Store:</span>
                <span className="font-medium">{viewingAdjustment.storeName}</span>
              </div>
              {viewingAdjustment.approvedByUserName && (
                <div className="flex justify-between">
                  <span>Approved By:</span>
                  <span>{viewingAdjustment.approvedByUserName} on {format(new Date(viewingAdjustment.approvalDate!), "MMM dd, yyyy")}</span>
                </div>
              )}
              <Separator />
              <h4 className="font-semibold">Items Adjusted:</h4>
              <ScrollArea className="h-[150px] pr-4">
                {viewingAdjustment.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2 text-muted-foreground mb-2">
                    <span className="col-span-1">{item.productName}</span>
                    <span className="text-center">
                      <Badge variant={getAdjustmentTypeBadgeVariant(item.adjustmentType)}>
                        {item.adjustmentType === AdjustmentType.Increase ? "+" : "-"}
                        {item.quantity}
                      </Badge>
                    </span>
                    <span className="col-span-3 text-xs text-muted-foreground">Reason: {item.reason}</span>
                  </div>
                ))}
              </ScrollArea>
              {viewingAdjustment.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold">Notes:</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">{viewingAdjustment.notes}</p>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default StockAdjustments;