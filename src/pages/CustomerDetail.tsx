"use client";

import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useCustomers } from "@/context/CustomerContext";
import { useSales } from "@/context/SaleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2, Mail, Phone, Home, Award, DollarSign, ShoppingCart, BarChart } from "lucide-react";
import SalesTable from "@/components/sales/SalesTable";
import { Sale, SaleItem } from "@/types/sale";
import ReceiptPreviewDialog from "@/components/sales/ReceiptPreviewDialog";
import RefundDialog from "@/components/sales/RefundDialog";
import SettleCreditSaleDialog from "@/components/sales/SettleCreditSaleDialog";
import { toast } from "sonner";
import { useProducts } from "@/context/ProductContext";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import DeleteCustomerDialog from "@/components/customers/DeleteCustomerDialog";
import CustomerUpsertForm from "@/components/customers/CustomerUpsertForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InventoryHistoryType } from "@/types/inventory";

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customers, updateCustomer, deleteCustomer } = useCustomers();
  const { salesHistory, refundSale, settleSale } = useSales();
  const { updateProductStock, products } = useProducts(); // Destructure products here
  const { currentCurrency } = useCurrency();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [selectedSaleForRefund, setSelectedSaleForRefund] = useState<Sale | null>(null);
  const [isSettleCreditSaleDialogOpen, setIsSettleCreditSaleDialogOpen] = useState(false);
  const [selectedSaleForSettle, setSelectedSaleForSettle] = useState<Sale | null>(null);

  const customer = useMemo(() => customers.find(c => c.id === id), [customers, id]);
  const customerSalesHistory = useMemo(() =>
    salesHistory
      .filter(sale => sale.customerId === id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [salesHistory, id]
  );

  const customerStats = useMemo(() => {
    const sales = customerSalesHistory.filter(s => s.type === 'sale');
    const refunds = customerSalesHistory.filter(s => s.type === 'refund');

    const totalSpending = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalRefunded = refunds.reduce((sum, refund) => sum + Math.abs(refund.total), 0);
    
    const netSpending = totalSpending - totalRefunded;
    const totalOrders = sales.length;
    const averageOrderValue = totalOrders > 0 ? netSpending / totalOrders : 0;

    return {
      netSpending,
      totalOrders,
      averageOrderValue,
    };
  }, [customerSalesHistory]);

  if (!customer) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Customer not found</h1>
        <p className="text-muted-foreground">The customer you are looking for does not exist.</p>
        <Button asChild className="mt-4">
          <Link to="/customers">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
          </Link>
        </Button>
      </div>
    );
  }

  const handleViewReceipt = (sale: Sale) => {
    setSelectedSaleForReceipt(sale);
    setIsReceiptDialogOpen(true);
  };

  const handleRefundSale = (sale: Sale) => {
    setSelectedSaleForRefund(sale);
    setIsRefundDialogOpen(true);
  };

  const handleConfirmRefund = (refundItems: SaleItem[], refundTotal: number) => {
    if (!selectedSaleForRefund) return;
    const originalTaxRate = selectedSaleForRefund.taxRateApplied || 0;
    const calculatedRefundTax = refundTotal * originalTaxRate;
    const newRefundTransaction: Sale = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      items: refundItems.map(item => ({ ...item, quantity: -item.quantity })),
      subtotal: -refundTotal,
      tax: -calculatedRefundTax,
      total: -(refundTotal + calculatedRefundTax),
      status: "completed",
      type: "refund",
      originalSaleId: selectedSaleForRefund.id,
      customerId: selectedSaleForRefund.customerId,
      customerName: selectedSaleForRefund.customerName,
      taxRateApplied: originalTaxRate,
    };
    refundSale(newRefundTransaction);
    refundItems.forEach(item => {
      const product = products.find(p => p.id === item.productId); // products is now correctly in scope
      if (product) {
        updateProductStock(
          item.productId,
          product.stock + item.quantity,
          InventoryHistoryType.REFUND,
          newRefundTransaction.id,
          `Refunded ${item.quantity}x ${item.name} from Sale ID: ${selectedSaleForRefund.id.substring(0, 8)}`,
          undefined, // storeId
          undefined, // userId
          item.name // Pass product name
        );
      }
    });
    toast.success(`Refund processed for ${formatCurrency(newRefundTransaction.total, currentCurrency)}`);
    setIsRefundDialogOpen(false);
  };

  const handleSettleCreditSale = (sale: Sale) => {
    setSelectedSaleForSettle(sale);
    setIsSettleCreditSaleDialogOpen(true);
  };

  const confirmSettleCreditSale = (saleId: string) => {
    settleSale(saleId);
    toast.success(`Credit Sale settled successfully!`);
    setIsSettleCreditSaleDialogOpen(false);
  };

  const confirmDeleteCustomer = (customerId: string) => {
    deleteCustomer(customerId);
    toast.success("Customer deleted successfully!");
    navigate("/customers");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{customer.name}</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Customer Details</CardTitle>
            <CardDescription>Contact and loyalty information.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <span>{customer.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <span>{customer.phone || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-muted-foreground" />
            <span>{customer.address || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-muted-foreground" />
            <span>{customer.loyaltyPoints} Loyalty Points</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(customerStats.netSpending, currentCurrency)}</div>
            <p className="text-xs text-muted-foreground">Net spending after refunds</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerStats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Total number of purchases</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(customerStats.averageOrderValue, currentCurrency)}</div>
            <p className="text-xs text-muted-foreground">Average net spending per order</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesTable
            sales={customerSalesHistory}
            onViewReceipt={handleViewReceipt}
            onRefundSale={handleRefundSale}
            onSettleCreditSale={handleSettleCreditSale}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <CustomerUpsertForm
            initialCustomer={customer}
            onCustomerSubmit={(updatedCustomer) => {
              updateCustomer(customer.id, updatedCustomer);
              setIsEditDialogOpen(false);
            }}
            onClose={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {isDeleteDialogOpen && (
        <DeleteCustomerDialog
          customer={customer}
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={confirmDeleteCustomer}
        />
      )}

      {selectedSaleForReceipt && (
        <ReceiptPreviewDialog
          isOpen={isReceiptDialogOpen}
          onClose={() => setIsReceiptDialogOpen(false)}
          sale={selectedSaleForReceipt}
          customer={customer}
        />
      )}

      {selectedSaleForRefund && (
        <RefundDialog
          isOpen={isRefundDialogOpen}
          onClose={() => setIsRefundDialogOpen(false)}
          sale={selectedSaleForRefund}
          onRefundConfirm={handleConfirmRefund}
        />
      )}

      {selectedSaleForSettle && (
        <SettleCreditSaleDialog
          isOpen={isSettleCreditSaleDialogOpen}
          onClose={() => setIsSettleCreditSaleDialogOpen(false)}
          sale={selectedSaleForSettle}
          onConfirmSettle={confirmSettleCreditSale}
        />
      )}
    </div>
  );
};

export default CustomerDetail;