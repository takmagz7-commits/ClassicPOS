"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStores } from "@/context/StoreContext";

interface StoreSelectorProps {
  currentStoreId: string;
  onSelectStore: (storeId: string) => void;
}

const StoreSelector = ({ currentStoreId, onSelectStore }: StoreSelectorProps) => {
  const { stores } = useStores();

  if (stores.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No stores configured.</div>
    );
  }

  return (
    <Select value={currentStoreId} onValueChange={onSelectStore}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select Store" />
      </SelectTrigger>
      <SelectContent>
        {stores.map((store) => (
          <SelectItem key={store.id} value={store.id}>
            {store.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default StoreSelector;