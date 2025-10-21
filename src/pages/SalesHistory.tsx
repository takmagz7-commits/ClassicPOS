"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSales } from "@/context/SaleContext";
import SalesTable from "@/components/sales/SalesTable";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Sale, SaleItem } from "@/types/sale";
import ReceiptPreviewDialog from "@/components/sales/ReceiptPreviewDialog";
import RefundDialog from "@/components/sales/RefundDialog";
import SettleCreditSaleDialog from "@/components/sales/SettleCreditSaleDialog";
import { useCustomers } from "@/context/CustomerContext";
import { Customer } from "@/types/customer";
import { useProducts } from "@/context/ProductContext";
import { toast } from "sonner";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { InventoryHistoryType } from "@/types/inventory";
import ExportSalesDataButton from "@/components/sales/ExportSalesDataButton"; // New import
import { useStores } from "@/context/StoreContext"; // New import

const SalesHistory = () => {
  const { salesHistory, refundSale, settleSale } = useSales();
  const { customers } = useCustomers();
  const { updateProductStock, products } = useProducts();
  const { currentCurrency } = useCurrency();
  const { users } = useAuth();
  const { stores } = useStores(); // Get stores for filter

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [storeFilter, setStoreFilter] = useState<string>("all"); // New state for store filter
  const [sortKey, setSortKey] = useState<keyof Sale>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState<boolean>(false);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [selectedCustomerForReceipt, setSelectedCustomerForReceipt] = useState<Customer | undefined>(undefined);

  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState<boolean>(false);
  const [selectedSaleForRefund, setSelectedSaleForRefund] = useState<Sale | null>(null);

  const [isSettleCreditSaleDialogOpen, setIsSettleCreditSaleDialogOpen] = useState<boolean>(false);
  const [selectedSaleForSettle, setSelectedSaleForSettle] = useState<Sale | null>(null);

  const filteredAndSortedSales = useMemo(() => {
    let filteredSales = salesHistory;

    if (searchTerm) {
      filteredSales = filteredSales.filter(
        (sale) =>
          sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (sale.customerName && sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (dateRange.from && dateRange.to) {
      filteredSales = filteredSales.filter((sale) => {
        const saleDate = new Date(sale.date);
        return isWithinInterval(saleDate, {
          start: startOfDay(dateRange.from!),
          end: endOfDay(dateRange.to!),
        });
      });
    } else if (dateRange.from) {
      filteredSales = filteredSales.filter((sale) => {
        const saleDate = new Date(sale.date);
        return saleDate >= startOfDay(dateRange.from!);
      });
    } else if (dateRange.to) {
      filteredSales = filteredSales.filter((sale) => {
        const saleDate = new Date(sale.date);
        return saleDate <= endOfDay(dateRange.to!);
      });
    }

    if (statusFilter !== "all") {
      filteredSales = filteredSales.filter((sale) => sale.status === statusFilter);
    }

    if (typeFilter !== "all") {
      filteredSales = filteredSales.filter((sale) => sale.type === typeFilter);
    }

    if (customerFilter !== "all") {
      filteredSales = filteredSales.filter((sale) => sale.customerId === customerFilter);
    }

    if (employeeFilter !== "all") {
      filteredSales = filteredSales.filter((sale) => sale.employeeId === employeeFilter || sale.heldByEmployeeId === employeeFilter);
    }

    if (storeFilter !== "all") { // Apply store filter
      filteredSales = filteredSales.filter((sale) => sale.storeId === storeFilter);
    }

    const sortedSales = [...filteredSales].sort((a, b) => {
      let compareValue = 0;
      if (sortKey === "date") {
        compareValue = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortKey === "total") {
        compareValue = a.total - b.total;
      }
      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    return sortedSales;
  }, [salesHistory, searchTerm, dateRange, statusFilter, typeFilter, customerFilter, employeeFilter, storeFilter, sortKey, sortOrder]);

  const handleViewReceipt = (sale: Sale) => {
    setSelectedSaleForReceipt(sale);
    if (sale.customerId) {
      setSelectedCustomerForReceipt(customers.find(c => c.id === sale.customerId));
    } else {
      setSelectedCustomerForReceipt(undefined);
    }
    setIsReceiptDialogOpen(true);
  };

  const handleRefundSale = (sale: Sale) => {
    setSelectedSaleForRefund(sale);
    setIsRefundDialogOpen(true);
  };

  const handleConfirmRefund = (refundItems: SaleItem[], refundTotal: number) => {
    if (!selectedSaleForRefund) return;

    const originalTaxRate = selectedSaleForRefund.taxRateApplied !== undefined ? selectedSaleForRefund.taxRateApplied : 0;
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
      discountPercentage: selectedSaleForRefund.discountPercentage,
      discountAmount: selectedSaleForRefund.discountAmount,
      loyaltyPointsUsed: selectedSaleForRefund.loyaltyPointsUsed,
      loyaltyPointsDiscountAmount: selectedSaleForRefund.loyaltyPointsDiscountAmount,
      taxRateApplied: selectedSaleForRefund.taxRateApplied,
      employeeId: selectedSaleForRefund.employeeId,
      employeeName: selectedSaleForRefund.employeeName,
      storeId: selectedSaleForRefund.storeId, // Include storeId
      storeName: selectedSaleForRefund.storeName, // Include storeName
    };

    refundSale(newRefundTransaction);

    refundItems.forEach(item => {
      updateProductStock(
        item.productId,
        (products.find(p => p.id === item.productId)?.stock || 0) + item.quantity,
        InventoryHistoryType.REFUND,
        newRefundTransaction.id,
        `Refunded ${item.quantity}x ${item.name} from Sale ID: ${selectedSaleForRefund.id.substring(0, 8)}`,
        selectedSaleForRefund.storeId, // Pass storeId for refund
        undefined,
        item.name
      );
    });

    toast.success(`Refund processed for Sale ID: ${selectedSaleForRefund.id.substring(0, 8)}. Total: ${formatCurrency(newRefundTransaction.total, currentCurrency)}`);
    setIsRefundDialogOpen(false);
    setSelectedSaleForRefund(null);
  };

  const handleSettleCreditSale = (sale: Sale) => {
    setSelectedSaleForSettle(sale);
    setIsSettleCreditSaleDialogOpen(true);
  };

  const confirmSettleCreditSale = (saleId: string) => {
    settleSale(saleId);
    toast.success(`Credit Sale ID: ${saleId.substring(0, 8)} settled successfully!`);
    setIsSettleCreditSaleDialogOpen(false);
    setSelectedSaleForSettle(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sales History</h1>
        <ExportSalesDataButton sales={filteredAndSortedSales} filename="sales_history" /> {/* New Export Button */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <Input
              placeholder="Search by Sale ID or Customer Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm flex-1"
            />

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={dateRange as { from: Date; to?: Date }}
                  onSelect={(range) => setDateRange(range as { from: Date | undefined; to?: Date | undefined })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
              </SelectContent>
            </Select>

            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} ({customer.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {users.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.email} ({employee.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={storeFilter} onValueChange={setStoreFilter}> {/* New Store Filter */}
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Store" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortKey} onValueChange={(value: keyof Sale) => setSortKey(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="total">Total Amount</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SalesTable
            sales={filteredAndSortedSales}
            onViewReceipt={handleViewReceipt}
            onRefundSale={handleRefundSale}
            onSettleCreditSale={handleSettleCreditSale}
          />
        </CardContent>
      </Card>

      {selectedSaleForReceipt && (
        <ReceiptPreviewDialog
          isOpen={isReceiptDialogOpen}
          onClose={() => setIsReceiptDialogOpen(false)}
          sale={selectedSaleForReceipt}
          customer={selectedCustomerForReceipt}
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

export default SalesHistory;