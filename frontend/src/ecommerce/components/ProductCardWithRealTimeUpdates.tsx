import React from 'react';
import { Package, AlertTriangle, CheckCircle } from 'lucide-react';
import useProductUpdates from '../../hooks/useProductUpdates';

interface ProductCardProps {
  productId: number;
  variantId?: number;
  title: string;
  price: number;
  stock: number;
  status: string;
  image: string;
}

const ProductCardWithRealTimeUpdates: React.FC<ProductCardProps> = ({
  productId,
  variantId,
  title,
  price: initialPrice,
  stock: initialStock,
  status: initialStatus,
  image
}) => {
  const { stock, price, status, lastUpdated, hasUpdates } = useProductUpdates(productId, variantId);

  // Use real-time data if available, otherwise fall back to initial data
  const currentStock = stock !== null ? stock : initialStock;
  const currentPrice = price !== null ? price : initialPrice;
  const currentStatus = status !== null ? status : initialStatus;

  const getStockStatus = () => {
    if (currentStock === 0) return { level: 'out', color: 'text-red-600', icon: AlertTriangle };
    if (currentStock <= 10) return { level: 'low', color: 'text-yellow-600', icon: AlertTriangle };
    return { level: 'good', color: 'text-green-600', icon: CheckCircle };
  };

  const stockStatus = getStockStatus();
  const StockIcon = stockStatus.icon;

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 ${
      hasUpdates ? 'ring-2 ring-blue-400' : ''
    }`}>
      <div className="relative">
        <img 
          src={image} 
          alt={title}
          className="w-full h-48 object-cover"
        />
        {hasUpdates && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            Live Update
          </div>
        )}
        {currentStatus !== 'active' && (
          <div className="absolute top-2 left-2 bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
            {currentStatus}
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-xl font-bold text-gray-900">
            ${currentPrice.toFixed(2)}
          </span>
          <div className="flex items-center">
            <StockIcon className={`h-4 w-4 mr-1 ${stockStatus.color}`} />
            <span className={`text-sm font-medium ${stockStatus.color}`}>
              {currentStock} in stock
            </span>
          </div>
        </div>

        {hasUpdates && lastUpdated && (
          <div className="text-xs text-gray-500 mb-2">
            Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        )}

        <button 
          className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
            currentStock > 0 && currentStatus === 'active'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          disabled={currentStock === 0 || currentStatus !== 'active'}
        >
          {currentStock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

export default ProductCardWithRealTimeUpdates;
