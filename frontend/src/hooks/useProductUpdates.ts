import { useState, useEffect, useCallback } from 'react';
import { useInventory } from '../shared/inventoryContext';

interface ProductUpdateHook {
  stock: number | null;
  price: number | null;
  status: string | null;
  lastUpdated: string | null;
  hasUpdates: boolean;
}

export const useProductUpdates = (productId: number, variantId?: number): ProductUpdateHook => {
  const { inventoryUpdates, productStatusChanges } = useInventory();
  const [updates, setUpdates] = useState<ProductUpdateHook>({
    stock: null,
    price: null,
    status: null,
    lastUpdated: null,
    hasUpdates: false
  });

  const processUpdates = useCallback(() => {
    // Find relevant inventory updates
    const relevantInventoryUpdates = inventoryUpdates.filter(update => {
      if (update.productId !== productId) return false;
      if (variantId && update.variantId !== variantId) return false;
      return true;
    });

    // Find relevant status changes
    const relevantStatusChanges = productStatusChanges.filter(change => 
      change.productId === productId
    );

    if (relevantInventoryUpdates.length > 0 || relevantStatusChanges.length > 0) {
      const latestInventoryUpdate = relevantInventoryUpdates[0];
      const latestStatusChange = relevantStatusChanges[0];

      // For ProductCard (no variantId specified), use totalProductStock
      // For specific variants, use individual variant stock
      const stockToShow = variantId !== undefined 
        ? latestInventoryUpdate?.stock 
        : latestInventoryUpdate?.totalProductStock;

      setUpdates({
        stock: stockToShow || null,
        price: latestInventoryUpdate?.price || null,
        status: latestStatusChange?.status || null,
        lastUpdated: latestInventoryUpdate?.timestamp || latestStatusChange?.timestamp || null,
        hasUpdates: true
      });
    }
  }, [inventoryUpdates, productStatusChanges, productId, variantId]);

  useEffect(() => {
    processUpdates();
  }, [processUpdates]);

  return updates;
};

export default useProductUpdates;
