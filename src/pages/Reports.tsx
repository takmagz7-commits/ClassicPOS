import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useStores } from "@/context/StoreContext";
import { useAuth } from "@/components/auth/AuthContext";
import { SalesReport } from "@/modules/reports/SalesReport";
import { InventoryReport } from "@/modules/reports/InventoryReport";
import { CustomerReport } from "@/modules/reports/CustomerReport";
import { SupplierReport } from "@/modules/reports/SupplierReport";
import { TaxReport } from "@/modules/reports/TaxReport";
import { DebtorReport } from "@/modules/reports/DebtorReport";
import { ProductReport } from "@/modules/reports/ProductReport";
import { StaffReport } from "@/modules/reports/StaffReport";
import type { ReportFilters } from "@/context/ReportContext";

const Reports = () => {
  const { stores } = useStores();
  const { users } = useAuth();

  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
  });
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  const getFilters = (): ReportFilters => {
    const filters: ReportFilters = {};

    if (dateRange.from) {
      filters.startDate = format(dateRange.from, 'yyyy-MM-dd');
    }
    if (dateRange.to) {
      filters.endDate = format(dateRange.to, 'yyyy-MM-dd');
    }
    if (storeFilter !== "all") {
      filters.storeId = storeFilter;
    }
    if (userFilter !== "all") {
      filters.userId = userFilter;
    }

    return filters;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and reporting for your business
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Filter reports by date range, store, and staff member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.from && !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, yyyy")} -{" "}
                          {format(dateRange.to, "LLL dd, yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, yyyy")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      setDateRange({
                        from: range?.from,
                        to: range?.to
                      });
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Store</label>
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Stores" />
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Staff Member</label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
          <TabsTrigger value="debtors">Debtors</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-6">
          <SalesReport filters={getFilters()} />
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <InventoryReport filters={getFilters()} />
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <ProductReport filters={getFilters()} />
        </TabsContent>

        <TabsContent value="customers" className="mt-6">
          <CustomerReport filters={getFilters()} />
        </TabsContent>

        <TabsContent value="suppliers" className="mt-6">
          <SupplierReport filters={getFilters()} />
        </TabsContent>

        <TabsContent value="tax" className="mt-6">
          <TaxReport filters={getFilters()} />
        </TabsContent>

        <TabsContent value="debtors" className="mt-6">
          <DebtorReport filters={getFilters()} />
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <StaffReport filters={getFilters()} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
