"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Product } from "@/types/product";
import { Edit, Trash2, ImageIcon, ArrowUpDown, Check, X } from "lucide-react"; // Added Check and X icons
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";
import { useCategories } from "@/context/CategoryContext";
import ImagePreviewDialog from "@/components/common/ImagePreviewDialog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge"; // Import Badge
import { useStores } from "@/context/StoreContext"; // Import useStores

interface ProductTableProps {
  products: Product[];
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onSort: (key: keyof Product) => void;
  sortKey: keyof Product;
  sortOrder: "asc" | "desc";
}

const ProductTable = ({ products, onEditProduct, onDeleteProduct, onSort, sortKey, sortOrder }: ProductTableProps) => {
  const { currentCurrency } = useCurrency();
  const { getCategoryName } = useCategories();
  const { stores } = useStores(); // Get stores for displaying stock breakdown
  
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [previewImageAlt, setPreviewImageAlt] = useState("");

  const handleImageClick = (imageUrl: string, altText: string) => {
    setPreviewImageUrl(imageUrl);
    setPreviewImageAlt(altText);
    setIsImagePreviewOpen(true);
  };

  const renderSortIcon = (key: keyof Product) => {
    if (sortKey === key) {
      return sortOrder === "asc" ? (
        <ArrowUpDown className="ml-2 h-4 w-4 rotate-180" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      );
    }
    return <ArrowUpDown className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100" />;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Image</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSort("name")}
                className="group px-0 hover:bg-transparent"
              >
                Name
                {renderSortIcon("name")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSort("categoryId")}
                className="group px-0 hover:bg-transparent"
              >
                Category
                {renderSortIcon("categoryId")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSort("sku")}
                className="group px-0 hover:bg-transparent"
              >
                SKU
                {renderSortIcon("sku")}
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                onClick={() => onSort("price")}
                className="group px-0 hover:bg-transparent justify-end"
              >
                Retail Price
                {renderSortIcon("price")}
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                onClick={() => onSort("cost")}
                className="group px-0 hover:bg-transparent justify-end"
              >
                Cost Price
                {renderSortIcon("cost")}
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                onClick={() => onSort("wholesalePrice")}
                className="group px-0 hover:bg-transparent justify-end"
              >
                Wholesale Price
                {renderSortIcon("wholesalePrice")}
              </Button>
            </TableHead>
            <TableHead className="text-left"> {/* Changed to text-left for better multi-line display */}
              <Button
                variant="ghost"
                onClick={() => onSort("stock")}
                className="group px-0 hover:bg-transparent justify-start" // Changed to justify-start
              >
                Stock
                {renderSortIcon("stock")}
              </Button>
            </TableHead>
            <TableHead className="text-center">Track Stock</TableHead>
            <TableHead className="text-center">Available for Sale</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length > 0 ? (
            products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div 
                    className="w-16 h-16 bg-muted flex items-center justify-center rounded-md overflow-hidden cursor-pointer"
                    onClick={() => {
                      if (product.imageUrl) {
                        handleImageClick(product.imageUrl, product.name);
                      }
                    }}
                  >
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{getCategoryName(product.categoryId)}</TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell className="text-right">{formatCurrency(product.price, currentCurrency)}</TableCell>
                <TableCell className="text-right">{formatCurrency(product.cost, currentCurrency)}</TableCell>
                <TableCell className="text-right">{formatCurrency(product.wholesalePrice, currentCurrency)}</TableCell>
                <TableCell className="text-left"> {/* Changed to text-left */}
                  {product.trackStock ? (
                    product.stockByStore && Object.keys(product.stockByStore).length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {stores.map(store => (
                          <div key={store.id} className="flex justify-between text-xs text-muted-foreground">
                            <span>{store.name}:</span>
                            <span className="font-medium text-foreground">{product.stockByStore?.[store.id] ?? 0}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-semibold mt-1">
                          <span>Total:</span>
                          <span>{product.stock}</span>
                        </div>
                      </div>
                    ) : (
                      <Badge variant="secondary">Total: {product.stock}</Badge>
                    )
                  ) : (
                    <Badge variant="secondary">N/A</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {product.trackStock ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-red-500 mx-auto" />}
                </TableCell>
                <TableCell className="text-center">
                  {product.availableForSale ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-red-500 mx-auto" />}
                </TableCell>
                <TableCell className="text-center flex justify-center items-center space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => onEditProduct(product)}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDeleteProduct(product)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={11} className="h-24 text-center">
                No products found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      <ImagePreviewDialog
        isOpen={isImagePreviewOpen}
        onClose={() => setIsImagePreviewOpen(false)}
        imageUrl={previewImageUrl}
        altText={previewImageAlt}
      />
    </div>
  );
};

export default ProductTable;