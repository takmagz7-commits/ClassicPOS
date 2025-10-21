"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInventoryHistory } from "@/context/InventoryHistoryContext";
import InventoryHistoryTable from "@/components/inventory/InventoryHistoryTable";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, Filter } from "lucide-react";
import { format, startOfDay, endOfDay, isWithinInterval, subDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { InventoryHistoryType } from "@/types/inventory";
import { useProducts } from "@/context/ProductContext";
import { useStores } from "@/context/StoreContext";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";

const InventoryHistory = () => {
  const { history } = useInventoryHistory();
  const { products } = useProducts();
  const { stores } = useStores();
  const { users } = useAuth();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  const filteredHistory = useMemo(() => {
    let filtered = history;

    // 1. Filter by search term (description, product name, user name)
    if (searchTerm) {
      filtered = filtered.filter(
        (entry) =>
          entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (entry.productName && entry.productName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (entry.userName && entry.userName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // 2. Filter by date range
    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter((entry) => {
        const entryDate = new Date(entry.date);
        return isWithinInterval(entryDate, {
          start: startOfDay(dateRange.from!),
          end: endOfDay(dateRange.to!),
        });
      });
    } else if (dateRange.from) {
      filtered = filtered.filter((entry) => {
        const entryDate = new Date(entry.date);
        return entryDate >= startOfDay(dateRange.from!);
      });
    } else if (dateRange.to) {
      filtered = filtered.filter((entry) => {
        const entryDate = new Date(entry.date);
        return entryDate <= endOfDay(dateRange.to!);
      });
    }

    // 3. Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter((entry) => entry.type === typeFilter);
    }

    // 4. Filter by product
    if (productFilter !== "all") {
      filtered = filtered.filter((entry) => entry.productId === productFilter);
    }

    // 5. Filter by store
    if (storeFilter !== "all") {
      filtered = filtered.filter((entry) => entry.storeId === storeFilter);
    }

    // 6. Filter by user
    if (userFilter !== "all") {
      filtered = filtered.filter((entry) => entry.userId === userFilter);
    }

    // Sort by date descending by default
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [history, searchTerm, dateRange, typeFilter, productFilter, storeFilter, userFilter]);

  const resetFilters = () => {
    setSearchTerm("");
    setDateRange({ from: subDays(new Date(), 29), to: new Date() });
    setTypeFilter("all");
    setProductFilter("all");
    setStoreFilter("all");
    setUserFilter("all");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inventory History</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Inventory Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search description, product, or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

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

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.values(InventoryHistoryType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={storeFilter} onValueChange={setStoreFilter}>
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

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.email} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>
          <InventoryHistoryTable history={filteredHistory} />
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryHistory;