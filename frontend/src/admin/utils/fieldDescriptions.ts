// Centralized field descriptions for admin forms
// This provides helpful tooltips and explanations for all form fields across the admin panel

export const fieldDescriptions = {
  // Category fields
  category: {
    name: 'The display name of the category as it will appear to customers. Should be clear and descriptive.',
    slug: 'URL-friendly version of the name (e.g., "mens-shirts"). Used in website URLs. Automatically generated from name if left empty.',
    description: 'Optional detailed description of what products belong in this category. Helps customers understand category content.',
    image: 'Category thumbnail image. Displayed on category pages and navigation. Recommended size: 800x800px.',
    parentId: 'Select a parent category to create a subcategory (e.g., "T-Shirts" under "Men\'s Clothing"). Leave blank for top-level categories.',
    sortOrder: 'Controls display order. Lower numbers appear first. Use multiples of 10 (10, 20, 30) to make reordering easier.',
    status: 'Active categories are visible to customers. Inactive categories are hidden but not deleted.'
  },

  // Product fields
  product: {
    title: 'The product name as customers will see it. Should be descriptive and include key features.',
    description: 'Detailed product description. Include materials, features, care instructions, and what makes it special.',
    price: 'Base price in your currency. Additional costs (embroidery, rush orders) are added at checkout.',
    sku: 'Stock Keeping Unit - unique identifier for inventory tracking. Format: CATEGORY-PRODUCT-### (e.g., PATCH-TACTICAL-001)',
    categoryId: 'Primary category where this product appears. Choose the most specific category that fits.',
    subcategoryId: 'Optional subcategory for more specific classification. Must belong to selected parent category.',
    image: 'Main product image. First image customers see. Use high-quality photos with white/neutral background. Recommended: 1200x1200px.',
    availableSizes: 'Sizes available for apparel items. Add each size separately. Leave empty for non-apparel or one-size items.',
    hasSizing: 'Enable this for apparel products that come in multiple sizes (XS, S, M, L, XL, etc.). Disable for patches, accessories, or one-size items.',
    materials: 'List all materials used in production (e.g., "100% Cotton Twill", "Polyester Thread"). Helps customers make informed choices.',
    status: 'Active products appear in store. Inactive products are hidden. Draft products are only visible to admins.',
    featured: 'Featured products appear on the homepage and in special promotions. Limit to your best-selling or newest items.',
    customizable: 'Enable if customers can customize this product with embroidery, text, or design uploads.',
    stock: 'Current inventory quantity. System tracks automatically but you can adjust manually. Shows as "Out of Stock" when 0.',
    badges: 'Visual labels like "New", "Sale", "Limited Edition". Shows on product cards to draw attention.'
  },

  // Product Variant fields
  variant: {
    color: 'Color name as customers see it (e.g., "Navy Blue", "Forest Green"). Be specific to avoid confusion.',
    size: 'Size designation (XS, S, M, L, XL, One Size, etc.). Must match product\'s available sizes if sizing is enabled.',
    sku: 'Unique SKU for this specific variant. Example: SHIRT-001-RED-L for a large red shirt.',
    stock: 'Quantity available for this specific color/size combination. Tracked separately from other variants.',
    price: 'Price adjustment for this variant. Leave empty to use base product price. Enter positive number for upcharge, negative for discount.',
    isActive: 'Controls if this variant can be ordered. Disable discontinued colors/sizes without deleting historical data.'
  },

  // Order fields
  order: {
    status: 'Current order state: Pending (new), Processing (being made), Shipped (in transit), Delivered (received), Cancelled (voided).',
    trackingNumber: 'Shipping carrier tracking number. Customers use this to track their package. Auto-sent via email when added.',
    notes: 'Internal notes about this order. Not visible to customers. Use for special instructions or issues.',
    shippingAddress: 'Where the order should be delivered. Verify address accuracy before shipping.',
    paymentStatus: 'Payment state: Pending (awaiting), Paid (received), Failed (declined), Refunded (money returned).',
    shippingCost: 'Cost of shipping this order. Based on weight, destination, and shipping method selected by customer.'
  },

  // Customer fields
  customer: {
    name: 'Customer\'s full name as it appears on orders and shipping labels.',
    email: 'Primary email for order confirmations, shipping updates, and customer communications.',
    phone: 'Contact number for shipping issues or order clarifications. Include country code for international customers.',
    address: 'Default shipping address. Customers can change per order but this saves time for repeat orders.',
    notes: 'Internal notes about customer preferences, history, or special handling. Not visible to customer.',
    status: 'Active customers can place orders. Blocked customers cannot checkout (use for fraud prevention).'
  },

  // User fields (Admin/Staff)
  user: {
    username: 'Login username. Must be unique. Cannot be changed after creation.',
    email: 'Email for system notifications and password recovery. Must be unique.',
    password: 'Strong password required: minimum 8 characters, mix of letters and numbers.',
    role: 'Admin: full access. Manager: most features except user management. Staff: limited to orders and inventory.',
    status: 'Active users can login. Inactive users are blocked but account preserved.',
    firstName: 'User\'s first name for personalization and internal identification.',
    lastName: 'User\'s last name for personalization and internal identification.'
  },

  // Embroidery Options fields
  embroidery: {
    name: 'Option name as shown to customers (e.g., "3D Puff Embroidery", "Metallic Thread").',
    description: 'Explain what makes this option special and when customers might choose it.',
    category: 'Type: Coverage (how dense), Material (fabric type), Thread (color/type), Border (edge style), Backing (support), Upgrade (extras).',
    basePrice: 'Base cost for this option. Final price may vary by design size.',
    stitchCount: 'Average number of stitches. Higher = more detailed but longer production time and higher cost.',
    estimatedTime: 'Production time: "Same Day", "1-2 days", "3-5 days". Helps set customer expectations.',
    status: 'Active options appear during customization. Inactive options are hidden (for seasonal or discontinued items).'
  },

  // FAQ fields
  faq: {
    question: 'Customer\'s question exactly as they might ask it. Use natural, conversational language.',
    answer: 'Clear, helpful answer. Break complex topics into paragraphs. Use bullet points for steps.',
    category: 'Group related FAQs: Orders, Shipping, Products, Returns, Account, Customization, etc.',
    sortOrder: 'Display order within category. Lower numbers appear first. Use 10, 20, 30 for easy reordering.',
    status: 'Active FAQs appear in help section. Draft FAQs are hidden until reviewed and approved.'
  },

  // Payment fields
  payment: {
    method: 'How customer paid: Credit Card, PayPal, Bank Transfer, Cash on Delivery.',
    amount: 'Total amount paid in your currency. Should match order total.',
    transactionId: 'Unique ID from payment processor. Use for refunds or dispute resolution.',
    status: 'Pending (processing), Completed (received), Failed (declined), Refunded (returned to customer).',
    notes: 'Details about payment issues, partial payments, or special arrangements.'
  },

  // General fields used across multiple forms
  general: {
    createdAt: 'Date and time when this record was first created in the system.',
    updatedAt: 'Date and time of most recent modification to this record.',
    isActive: 'Active items are visible/usable. Inactive items are hidden but data is preserved.',
    tags: 'Keywords for search and filtering. Separate with commas. Examples: seasonal, bestseller, clearance.',
    metadata: 'Additional custom data in key-value pairs. For advanced users and integrations.'
  }
}

// Helper function to get field description
export const getFieldDescription = (section: string, field: string): string => {
  const descriptions = fieldDescriptions as any
  return descriptions[section]?.[field] || ''
}


