"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { useGRNs } from "@/context/GRNContext";
import { GoodsReceivedNote, GRNStatus } from "@/types/inventory";
import GRNTable from "@/components/inventory/GRNTable";
import GRNUpsertForm from "@/components/inventory/GRNUpsertForm";
import DeleteGRNDialog from "@/components/inventory/DeleteGRNDialog";
import { toast } from "sonner";
import { useSuppliers } from "@/context/SupplierContext";
import { useStores } from "@/context/StoreContext";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const GoodsReceivedNotes = () => {
  const { grns, addGRN, updateGRN, approveGRN, deleteGRN } = useGRNs();
  const { suppliers } = useSuppliers();
  const { stores } = useStores();
  const { currentCurrency } = useCurrency();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);

  const [editingGRN, setEditingGRN] = useState<GoodsReceivedNote | null>(null);
  const [deletingGRN, setDeletingGRN] = useState<GoodsReceivedNote | null>(null);
  const [viewingGRN, setViewingGRN] = useState<GoodsReceivedNote | null>(null);

  const handleGRNSubmit = (grnData: GoodsReceivedNote | Omit<GoodsReceivedNote, "id" | "status" | "supplierName" | "receivingStoreName" | "approvedByUserName" | "approvalDate">) => {
    if ('id' in grnData) {
      updateGRN(grnData);
    } else {
      addGRN(grnData);
    }
  };

  const handleViewDetails = (grn: GoodsReceivedNote) => {
    setViewingGRN(grn);
    setIsViewDetailsDialogOpen(true);
  };

  const handleEditGRN = (grn: GoodsReceivedNote) => {
    if (grn.status === "approved") {
      toast.error("Approved GRNs cannot be edited.");
      return;
    }
    setEditingGRN(grn);
    setIsEditDialogOpen(true);
  };

  const handleDeleteGRN = (grn: GoodsReceivedNote) => {
    setDeletingGRN(grn);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteGRN = (grnId: string) => {
    deleteGRN(grnId);
    toast.success("Goods Received Note deleted successfully!");
    setDeletingGRN(null);
  };

  const handleApproveGRN = (grnId: string) => {
    approveGRN(grnId);
  };

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Goods Received Notes</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create GRN
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Goods Received Note</DialogTitle>
            </DialogHeader>
            <GRNUpsertForm onGRNSubmit={handleGRNSubmit} onClose={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Goods Received Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <GRNTable
            grns={grns}
            onViewDetails={handleViewDetails}
            onEditGRN={handleEditGRN}
            onDeleteGRN={handleDeleteGRN}
            onApproveGRN={handleApproveGRN}
          />
        </CardContent>
      </Card>

      {editingGRN && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Goods Received Note</DialogTitle>
            </DialogHeader>
            <GRNUpsertForm
              initialGRN={editingGRN}
              onGRNSubmit={handleGRNSubmit}
              onClose={() => setIsEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {deletingGRN && (
        <DeleteGRNDialog
          grn={deletingGRN}
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={confirmDeleteGRN}
        />
      )}

      {viewingGRN && (
        <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Goods Received Note Details</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-sm">
              <div className="flex justify-between">
                <span>Reference No.:</span>
                <span className="font-medium">{viewingGRN.referenceNo}</span>
              </div>
              {viewingGRN.purchaseOrderId && (
                <div className="flex justify-between">
                  <span>Linked PO:</span>
                  <span className="font-medium">{viewingGRN.purchaseOrderId.substring(0, 8)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Supplier:</span>
                <span className="font-medium">{viewingGRN.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Receiving Store:</span>
                <span className="font-medium">{viewingGRN.receivingStoreName}</span>
              </div>
              <div className="flex justify-between">
                <span>Received Date:</span>
                <span>{format(new Date(viewingGRN.receivedDate), "MMM dd, yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span><Badge variant={getStatusBadgeVariant(viewingGRN.status)}>{viewingGRN.status}</Badge></span>
              </div>
              {viewingGRN.approvedByUserName && (
                <div className="flex justify-between">
                  <span>Approved By:</span>
                  <span>{viewingGRN.approvedByUserName} on {format(new Date(viewingGRN.approvalDate!), "MMM dd, yyyy")}</span>
                </div>
              )}
              <Separator />
              <h4 className="font-semibold">Items Received:</h4>
              <ScrollArea className="h-[150px] pr-4">
                {viewingGRN.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2 text-muted-foreground mb-2">
                    <span className="col-span-1">{item.productName}</span>
                    <span className="text-center">{item.quantityReceived}x</span>
                    <span className="text-right">{formatCurrency(item.unitCost, currentCurrency)} each</span>
                    <span className="col-span-3 text-right font-medium">{formatCurrency(item.totalCost, currentCurrency)}</span>
                  </div>
                ))}
              </ScrollArea>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total Value:</span>
                <span>{formatCurrency(viewingGRN.totalValue, currentCurrency)}</span>
              </div>
              {viewingGRN.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold">Notes:</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">{viewingGRN.notes}</p>
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

export default GoodsReceivedNotes;