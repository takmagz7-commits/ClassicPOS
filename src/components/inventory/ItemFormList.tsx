"use client";

import React from "react";
import { Control, FieldErrors, FieldValues, FieldError } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { PlusCircle, XCircle } from "lucide-react";
import { BaseInventoryItem } from "@/types/inventory";
import { Form as ShadcnForm } from "@/components/ui/form";

interface ItemFormListProps<TFormValues extends FieldValues, TItem extends BaseInventoryItem> {
  items: TItem[];
  onRemoveItem: (index: number) => void;
  onAddItem: () => void;
  control: Control<TFormValues>;
  errors: FieldErrors<TFormValues>;
  renderItem: (
    item: TItem,
    index: number,
    control: Control<TFormValues>,
    errors: FieldErrors<TFormValues>,
    isFormDisabled: boolean,
  ) => React.ReactNode;
  isRemoveButtonDisabled?: boolean;
  isFormDisabled?: boolean;
  renderAddButton?: (onAdd: () => void, isDisabled: boolean) => React.ReactNode;
}

const ItemFormList = <TFormValues extends FieldValues, TItem extends BaseInventoryItem>({
  items,
  onRemoveItem,
  onAddItem,
  control,
  errors,
  renderItem,
  isRemoveButtonDisabled = false,
  isFormDisabled = false,
  renderAddButton,
}: ItemFormListProps<TFormValues, TItem>) => {
  // Safely access the top-level error message for the 'items' array
  const itemsArrayError = errors.items as FieldError | undefined;

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-end gap-2 border-b pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
            {renderItem(item, index, control, errors, isFormDisabled)}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemoveItem(index)}
            disabled={isRemoveButtonDisabled || isFormDisabled || items.length === 1}
          >
            <XCircle className="h-5 w-5 text-destructive" />
            <span className="sr-only">Remove Item</span>
          </Button>
        </div>
      ))}
      {itemsArrayError?.message && (
        <p className="text-sm font-medium text-destructive">
          {itemsArrayError.message}
        </p>
      )}
      <div className="flex justify-end">
        {renderAddButton ? (
          renderAddButton(onAddItem, isFormDisabled)
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={onAddItem} disabled={isFormDisabled}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
          </Button>
        )}
      </div>
    </div>
  );
};

export default ItemFormList;