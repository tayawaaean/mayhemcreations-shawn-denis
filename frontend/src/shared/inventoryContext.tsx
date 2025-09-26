import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { webSocketService } from './websocketService';

export interface InventoryUpdate {
  productId: number;
  variantId?: number | null;
  stock?: number;
  totalProductStock?: number;
  price?: number;
  status?: string;
  timestamp: string;
}

export interface StockAlert {
  productId: number;
  variantId?: number | null;
  stockLevel: string;
  message: string;
  timestamp: string;
}

export interface ProductStatusChange {
  productId: number;
  status: string;
  timestamp: string;
}

interface InventoryContextType {
  // Real-time updates
  inventoryUpdates: InventoryUpdate[];
  stockAlerts: StockAlert[];
  productStatusChanges: ProductStatusChange[];
  
  // Methods
  clearInventoryUpdates: () => void;
  clearStockAlerts: () => void;
  clearProductStatusChanges: () => void;
  
  // Connection status
  isConnected: boolean;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inventoryUpdates, setInventoryUpdates] = useState<InventoryUpdate[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [productStatusChanges, setProductStatusChanges] = useState<ProductStatusChange[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Define event handlers
    const handleInventoryUpdate = (data: InventoryUpdate) => {
      console.log('📦 Inventory updated:', data);
      setInventoryUpdates(prev => [data, ...prev.slice(0, 49)]); // Keep last 50 updates
    };

    const handleStockAlert = (data: StockAlert) => {
      console.log('⚠️ Stock alert:', data);
      setStockAlerts(prev => [data, ...prev.slice(0, 49)]); // Keep last 50 alerts
    };

    const handleProductStatusChange = (data: ProductStatusChange) => {
      console.log('📦 Product status changed:', data);
      setProductStatusChanges(prev => [data, ...prev.slice(0, 49)]); // Keep last 50 changes
    };

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    // Subscribe to inventory events using the correct methods
    webSocketService.on('inventory_updated', handleInventoryUpdate);
    webSocketService.on('stock_alert', handleStockAlert);
    webSocketService.on('product_status_changed', handleProductStatusChange);
    webSocketService.on('connect', handleConnect);
    webSocketService.on('disconnect', handleDisconnect);

    return () => {
      // Unsubscribe from events
      webSocketService.off('inventory_updated', handleInventoryUpdate);
      webSocketService.off('stock_alert', handleStockAlert);
      webSocketService.off('product_status_changed', handleProductStatusChange);
      webSocketService.off('connect', handleConnect);
      webSocketService.off('disconnect', handleDisconnect);
    };
  }, []);

  const clearInventoryUpdates = () => setInventoryUpdates([]);
  const clearStockAlerts = () => setStockAlerts([]);
  const clearProductStatusChanges = () => setProductStatusChanges([]);

  const value: InventoryContextType = {
    inventoryUpdates,
    stockAlerts,
    productStatusChanges,
    clearInventoryUpdates,
    clearStockAlerts,
    clearProductStatusChanges,
    isConnected
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = (): InventoryContextType => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
