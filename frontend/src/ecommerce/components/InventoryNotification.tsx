import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Package, CheckCircle } from 'lucide-react';
import { useInventory } from '../../shared/inventoryContext';

interface InventoryNotificationProps {
  productId?: number;
  variantId?: number;
}

const InventoryNotification: React.FC<InventoryNotificationProps> = ({ 
  productId, 
  variantId 
}) => {
  const { inventoryUpdates, stockAlerts, isConnected } = useInventory();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Filter notifications for specific product/variant if provided
    let relevantUpdates = inventoryUpdates;
    let relevantAlerts = stockAlerts;

    if (productId) {
      relevantUpdates = inventoryUpdates.filter(update => update.productId === productId);
      relevantAlerts = stockAlerts.filter(alert => alert.productId === productId);
      
      if (variantId) {
        relevantUpdates = relevantUpdates.filter(update => update.variantId === variantId);
        relevantAlerts = relevantAlerts.filter(alert => alert.variantId === variantId);
      }
    }

    // Combine and sort by timestamp
    const allNotifications = [
      ...relevantUpdates.map(update => ({
        type: 'inventory_update',
        data: update,
        timestamp: new Date(update.timestamp)
      })),
      ...relevantAlerts.map(alert => ({
        type: 'stock_alert',
        data: alert,
        timestamp: new Date(alert.timestamp)
      }))
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setNotifications(allNotifications.slice(0, 3)); // Show only latest 3
  }, [inventoryUpdates, stockAlerts, productId, variantId]);

  if (!isConnected || notifications.length === 0 || !isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      {notifications.map((notification, index) => (
        <div
          key={`${notification.type}-${notification.data.timestamp}`}
          className={`mb-2 p-4 rounded-lg shadow-lg border-l-4 ${
            notification.type === 'stock_alert'
              ? 'bg-red-50 border-red-400 text-red-800'
              : 'bg-blue-50 border-blue-400 text-blue-800'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              {notification.type === 'stock_alert' ? (
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              ) : (
                <Package className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {notification.type === 'stock_alert' ? 'Stock Alert' : 'Inventory Updated'}
                </p>
                <p className="text-xs mt-1">
                  {notification.type === 'stock_alert' 
                    ? notification.data.message
                    : `Stock updated: ${notification.data.previousStock} → ${notification.data.stock} units`
                  }
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notification.data.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InventoryNotification;
