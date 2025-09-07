import type { Product } from '../types'

export const products: Product[] = [
  // Apparel - T-Shirts
  {
    id: 'mayhem-001',
    title: 'Embroidered Classic Tee',
    price: 24.0,
    description: '100% cotton tee with premium embroidery on chest.',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center',
    alt: 'Embroidered white tee on table',
    badges: ['best seller'],
    category: 'apparel',
    subcategory: 'tshirt',
    availableColors: ['White', 'Black', 'Navy', 'Gray', 'Red', 'Forest Green'],
    availableSizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  },
  {
    id: 'mayhem-007',
    title: 'Vintage Wash Tee',
    price: 22.0,
    description: 'Soft vintage wash cotton tee with custom embroidery.',
    image: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400&h=400&fit=crop&crop=center',
    alt: 'Vintage wash t-shirt',
    badges: [],
    category: 'apparel',
    subcategory: 'tshirt',
    availableColors: ['Vintage White', 'Vintage Black', 'Vintage Navy', 'Vintage Gray'],
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL']
  },
  {
    id: 'mayhem-008',
    title: 'Long Sleeve Tee',
    price: 28.0,
    description: 'Comfortable long sleeve tee with embroidered design.',
    image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop&crop=center',
    alt: 'Long sleeve t-shirt',
    badges: [],
    category: 'apparel',
    subcategory: 'tshirt',
    availableColors: ['White', 'Black', 'Navy', 'Gray', 'Burgundy'],
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL']
  },

  // Apparel - Polo Shirts
  {
    id: 'mayhem-009',
    title: 'Classic Polo Shirt',
    price: 32.0,
    description: 'Professional polo shirt with embroidered logo.',
    image: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=400&h=400&fit=crop&crop=center',
    alt: 'Classic polo shirt',
    badges: [],
    category: 'apparel',
    subcategory: 'poloshirt',
    availableColors: ['White', 'Black', 'Navy', 'Royal Blue', 'Forest Green', 'Maroon'],
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']
  },
  {
    id: 'mayhem-010',
    title: 'Performance Polo',
    price: 38.0,
    description: 'Moisture-wicking polo with custom embroidery.',
    image: 'https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?w=400&h=400&fit=crop&crop=center',
    alt: 'Performance polo shirt',
    badges: ['new'],
    category: 'apparel',
    subcategory: 'poloshirt'
  },

  // Apparel - Hoodies
  {
    id: 'mayhem-005',
    title: 'Crewneck Hoodie',
    price: 42.0,
    description: 'Cozy hoodie with embroidered logo on chest.',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop&crop=center',
    alt: 'Crewneck hoodie folded',
    badges: ['limited'],
    category: 'apparel',
    subcategory: 'hoodie',
    availableColors: ['Black', 'Navy', 'Gray', 'Charcoal', 'Forest Green', 'Burgundy'],
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL']
  },
  {
    id: 'mayhem-011',
    title: 'Zip-Up Hoodie',
    price: 45.0,
    description: 'Full-zip hoodie with embroidered chest design.',
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=400&fit=crop&crop=center',
    alt: 'Zip-up hoodie',
    badges: [],
    category: 'apparel',
    subcategory: 'hoodie'
  },

  // Accessories - Caps
  {
    id: 'mayhem-003',
    title: 'Embroidered Cap',
    price: 18.0,
    description: 'High-profile cap with custom front embroidery.',
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop&crop=center',
    alt: 'Black embroidered cap',
    badges: [],
    category: 'accessories',
    subcategory: 'cap'
  },
  {
    id: 'mayhem-012',
    title: 'Snapback Cap',
    price: 20.0,
    description: 'Adjustable snapback with embroidered logo.',
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop&crop=center',
    alt: 'Snapback cap',
    badges: [],
    category: 'accessories',
    subcategory: 'cap'
  },
  {
    id: 'mayhem-013',
    title: 'Trucker Cap',
    price: 19.0,
    description: 'Classic trucker cap with mesh back and embroidery.',
    image: 'https://images.unsplash.com/photo-1575428652377-a2d80e2277fc?w=400&h=400&fit=crop&crop=center',
    alt: 'Trucker cap',
    badges: [],
    category: 'accessories',
    subcategory: 'cap'
  },

  // Accessories - Bags
  {
    id: 'mayhem-004',
    title: 'Tote Bag (16x14)',
    price: 16.0,
    description: 'Canvas tote with reinforced handles and embroidery.',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&crop=center',
    alt: 'Canvas tote bag flat lay',
    badges: [],
    category: 'accessories',
    subcategory: 'bag'
  },
  {
    id: 'mayhem-014',
    title: 'Drawstring Backpack',
    price: 22.0,
    description: 'Lightweight drawstring backpack with custom embroidery.',
    image: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5e?w=400&h=400&fit=crop&crop=center',
    alt: 'Drawstring backpack',
    badges: [],
    category: 'accessories',
    subcategory: 'bag'
  },
  {
    id: 'mayhem-015',
    title: 'Crossbody Bag',
    price: 28.0,
    description: 'Stylish crossbody bag with embroidered design.',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&crop=center',
    alt: 'Crossbody bag',
    badges: ['new'],
    category: 'accessories',
    subcategory: 'bag'
  },

  // Embroidery
  {
    id: 'mayhem-002',
    title: 'Custom Patch (3-inch)',
    price: 8.5,
    description: 'Durable embroidered patch with iron-on backing.',
    image: 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=400&h=400&fit=crop&crop=center',
    alt: 'Round embroidered patch',
    badges: ['new'],
    category: 'embroidery'
  },
  {
    id: 'mayhem-006',
    title: 'Custom Patch Pack (5)',
    price: 35.0,
    description: 'Five custom patches with discounted pack price.',
    image: 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=400&h=400&fit=crop&crop=center',
    alt: 'Set of embroidered patches',
    badges: [],
    category: 'embroidery'
  }
]