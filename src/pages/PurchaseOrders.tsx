"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { usePurchaseOrders } from "@/context/PurchaseOrderContext";
import { PurchaseOrder, PurchaseOrderStatus } from "@/types/inventory";
import PurchaseOrderTable from "@/components/inventory/PurchaseOrderTable";
import PurchaseOrderUpsertForm from "@/components/inventory/PurchaseOrderUpsertForm";
import DeletePurchaseOrderDialog from "@/components/inventory/DeletePurchaseOrderDialog";
import { toast } from "sonner";
import { useSuppliers } from "@/context/SupplierContext"; // To display supplier names
import { useProducts } from "@/context/ProductContext"; // To display product names
import { useCurrency } from "@/context/CurrencyContext"; // For currency formatting
import { formatCurrency } from "@/lib/utils"; // For currency formatting
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns"; // Import format from date-fns
import { Badge } from "@/components/ui/badge"; // Import Badge

const PurchaseOrders = () => {
  const { purchaseOrders, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder } = usePurchaseOrders();
  const { suppliers } = useSuppliers();
  const { products } = useProducts();
  const { currentCurrency } = useCurrency();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);

  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<PurchaseOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);

  const handlePurchaseOrderSubmit = (orderData: Omit<PurchaseOrder, "id"> | PurchaseOrder) => {
    if ('id' in orderData) {
      updatePurchaseOrder(orderData);
    } else {
      addPurchaseOrder(orderData);
    }
  };

  const handleViewDetails = (order: PurchaseOrder) => {
    setViewingOrder(order);
    setIsViewDetailsDialogOpen(true);
  };

  const handleEditOrder = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setIsEditDialogOpen(true);
  };

  const handleDeleteOrder = (order: PurchaseOrder) => {
    setDeletingOrder(order);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteOrder = (orderId: string) => {
    deletePurchaseOrder(orderId);
    toast.success("Purchase Order deleted successfully!");
    setDeletingOrder(null);
  };

  // Helper function for badge variant, defined here for use in the dialog
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

  // The `enhancedPurchaseOrders` is no longer needed as `supplierName` is now managed in context.
  // const enhancedPurchaseOrders = purchaseOrders.map(order => ({
  //   ...order,
  //   supplierName: suppliers.find(s => s.id === order.supplierId)?.name || "Unknown Supplier",
  // }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create PO
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Purchase Order</DialogTitle>
            </DialogHeader>
            <PurchaseOrderUpsertForm onPurchaseOrderSubmit={handlePurchaseOrderSubmit} onClose={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseOrderTable
            purchaseOrders={purchaseOrders}
            onViewDetails={handleViewDetails}
            onEditOrder={handleEditOrder}
            onDeleteOrder={handleDeleteOrder}
          />
        </CardContent>
      </Card>

      {editingOrder && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Purchase Order</DialogTitle>
            </DialogHeader>
            <PurchaseOrderUpsertForm
              initialPurchaseOrder={editingOrder}
              onPurchaseOrderSubmit={handlePurchaseOrderSubmit}
              onClose={() => setIsEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {deletingOrder && (
        <DeletePurchaseOrderDialog
          order={deletingOrder}
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={confirmDeleteOrder}
        />
      )}

      {viewingOrder && (
        <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Purchase Order Details</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-sm">
              <div className="flex justify-between">
                <span>Reference No.:</span>
                <span className="font-medium">{viewingOrder.referenceNo}</span>
              </div>
              <div className="flex justify-between">
                <span>Supplier:</span>
                <span className="font-medium">{viewingOrder.supplierName || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span>Order Date:</span>
                <span>{format(new Date(viewingOrder.orderDate), "MMM dd, yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span>Expected Delivery:</span>
                <span>{viewingOrder.expectedDeliveryDate ? format(new Date(viewingOrder.expectedDeliveryDate), "MMM dd, yyyy") : "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span><Badge variant={getStatusBadgeVariant(viewingOrder.status)}>{viewingOrder.status}</Badge></span>
              </div>
              <Separator />
              <h4 className="font-semibold">Items:</h4>
              <ScrollArea className="h-[150px] pr-4">
                {viewingOrder.items.map((item, index) => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <div key={index} className="grid grid-cols-3 gap-2 text-muted-foreground mb-2">
                      <span className="col-span-1">{product?.name || "Unknown Product"}</span>
                      <span className="text-center">{item.quantity}x</span>
                      <span className="text-right">{formatCurrency(item.unitCost, currentCurrency)} each</span>
                      <span className="col-span-3 text-right font-medium">{formatCurrency(item.quantity * item.unitCost, currentCurrency)}</span>
                    </div>
                  );
                })}
              </ScrollArea>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total Value:</span>
                <span>{formatCurrency(viewingOrder.totalValue, currentCurrency)}</span>
              </div>
              {viewingOrder.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold">Notes:</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">{viewingOrder.notes}</p>
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

export default PurchaseOrders;