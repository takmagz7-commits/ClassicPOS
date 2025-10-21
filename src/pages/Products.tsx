"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import ProductTable from "@/components/products/ProductTable";
import { Product } from "@/types/product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ProductUpsertForm from "@/components/products/ProductUpsertForm";
import DeleteProductDialog from "@/components/products/DeleteProductDialog";
import { PlusCircle, Search, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { useProducts } from "@/context/ProductContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "@/context/CategoryContext";
import { cn } from "@/lib/utils";
import ExportProductsDataButton from "@/components/products/ExportProductsDataButton"; // New import
import { format } from "date-fns"; // Import format for filename

const LOW_STOCK_THRESHOLD = 10;

const Products = () => {
  const { products, addProduct, updateProduct, deleteProduct, getEffectiveProductStock } = useProducts();
  const { categories } = useCategories();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("all"); // 'all', 'in-stock', 'low-stock', 'out-of-stock', 'not-tracked'
  const [sortKey, setSortKey] = useState<keyof Product>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleProductSubmit = (product: Product) => {
    if (products.some(p => p.id === product.id)) {
      updateProduct(product);
    } else {
      addProduct(product);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setDeletingProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteProduct = (productId: string) => {
    deleteProduct(productId);
    toast.success("Product deleted successfully!");
    setDeletingProduct(null);
  };

  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const effectiveStock = getEffectiveProductStock(product.id); // Use effective stock for filtering

      const matchesSearchTerm =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategoryId === "all" || product.categoryId === selectedCategoryId;

      let matchesStockStatus = true;
      if (stockStatusFilter === "in-stock") {
        matchesStockStatus = product.trackStock && effectiveStock > 0;
      } else if (stockStatusFilter === "low-stock") {
        matchesStockStatus = product.trackStock && effectiveStock > 0 && effectiveStock <= LOW_STOCK_THRESHOLD;
      } else if (stockStatusFilter === "out-of-stock") {
        matchesStockStatus = product.trackStock && effectiveStock === 0;
      } else if (stockStatusFilter === "not-tracked") {
        matchesStockStatus = !product.trackStock;
      }

      return matchesSearchTerm && matchesCategory && matchesStockStatus;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;
      if (sortKey === "name" || sortKey === "sku") {
        compareValue = a[sortKey].localeCompare(b[sortKey]);
      } else if (sortKey === "price" || sortKey === "cost" || sortKey === "wholesalePrice") {
        compareValue = a[sortKey] - b[sortKey];
      } else if (sortKey === "stock") { // Sort by effective stock
        compareValue = getEffectiveProductStock(a.id) - getEffectiveProductStock(b.id);
      } else if (sortKey === "categoryId") {
        const categoryA = categories.find(cat => cat.id === a.categoryId)?.name || "";
        const categoryB = categories.find(cat => cat.id === b.categoryId)?.name || "";
        compareValue = categoryA.localeCompare(categoryB);
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    return filtered;
  }, [products, searchTerm, selectedCategoryId, stockStatusFilter, sortKey, sortOrder, categories, getEffectiveProductStock]);

  const handleSort = (key: keyof Product) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="flex items-center gap-2">
          <ExportProductsDataButton products={filteredAndSortedProducts} filename="product_catalog" /> {/* New Export Button */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <ProductUpsertForm onProductSubmit={handleProductSubmit} onClose={() => setIsAddDialogOpen(false)} />
            </DialogContent>
          </Dialog>

          {editingProduct && (
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Product</DialogTitle>
                </DialogHeader>
                <ProductUpsertForm
                  initialProduct={editingProduct}
                  onProductSubmit={handleProductSubmit}
                  onClose={() => setIsEditDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}

          {deletingProduct && (
            <DeleteProductDialog
              product={deletingProduct}
              isOpen={isDeleteDialogOpen}
              onClose={() => setIsDeleteDialogOpen(false)}
              onConfirm={confirmDeleteProduct}
            />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock (&le;{LOW_STOCK_THRESHOLD})</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                <SelectItem value="not-tracked">Not Tracked</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setSelectedCategoryId("all");
              setStockStatusFilter("all");
              setSortKey("name");
              setSortOrder("asc");
            }}>
              Reset Filters
            </Button>
          </div>

          <ProductTable
            products={filteredAndSortedProducts}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            onSort={handleSort}
            sortKey={sortKey}
            sortOrder={sortOrder}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Products;