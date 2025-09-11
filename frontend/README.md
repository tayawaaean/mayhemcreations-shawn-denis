# Mayhem Creations Frontend

A comprehensive e-commerce platform built with React, TypeScript, and Tailwind CSS, featuring product customization, multi-role admin panels, and seamless user experience.

## 🚀 Implemented Features

### E-commerce Core Features
- **Product Catalog**: Browse products with filtering, sorting, and search
- **Product Customization**: Interactive design tool with drag-and-drop functionality
- **Shopping Cart**: Persistent cart with localStorage and real-time updates
- **Checkout Process**: Multi-step checkout with payment integration
- **Order Management**: Order history and tracking for customers
- **Responsive Design**: Mobile-first design with Tailwind CSS

### Authentication & User Management
- **Multi-Role System**: Customer, Admin, Seller, and Employee roles
- **Session Management**: Secure authentication with backend integration
- **Account Switching**: Seamless switching between different account types
- **Profile Management**: User profile editing and preferences

### Admin Panel Features
- **Dashboard**: Comprehensive analytics and overview
- **User Management**: Create, edit, and manage users across all roles
- **Product Management**: Add, edit, and organize products and categories
- **Order Management**: Process orders, track fulfillment, and handle refunds
- **Customer Support**: Message management and FAQ system
- **Analytics**: Sales reports, user behavior, and performance metrics
- **Inventory Management**: Stock tracking and low-stock alerts

### Seller Panel Features
- **Product Management**: Add and manage seller-specific products
- **Order Fulfillment**: Process and track seller orders
- **Analytics**: Seller-specific performance metrics
- **Inventory Tracking**: Stock management and updates

### Technical Features
- **TypeScript**: Full type safety across the application
- **Context API**: State management for cart, authentication, and customization
- **React Router**: Client-side routing with protected routes
- **Component Library**: Reusable UI components with consistent design
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Performance**: Code splitting and lazy loading for optimal performance

## 🎨 Design System

### Color Palette
- Primary colors defined in `src/styles/index.css` as CSS variables
- `--color-primary`: Main brand color
- `--color-accent`: Accent color for highlights
- `--color-neutral`: Neutral tones for text and backgrounds
- Easily customizable by updating CSS variables

### Component Architecture
- **Shared Components**: Reusable UI elements (Button, Modal, etc.)
- **E-commerce Components**: Product-specific components (ProductCard, Cart, etc.)
- **Admin Components**: Admin panel specific components
- **Layout Components**: Navigation, sidebars, and page layouts

## 🔄 User Flows

### Customer Shopping Flow
1. **Browse Products**: Filter by category, search, and sort options
2. **Product Details**: View product information, images, and reviews
3. **Customization**: Use interactive design tool for personalized products
4. **Add to Cart**: Add customized or standard products to cart
5. **Checkout**: Multi-step checkout with shipping and payment
6. **Order Confirmation**: Receive confirmation and tracking information

### Admin Management Flow
1. **Login**: Secure authentication with role validation
2. **Dashboard**: Overview of key metrics and recent activity
3. **User Management**: Create, edit, and manage user accounts
4. **Product Management**: Add products, manage categories, and inventory
5. **Order Processing**: Review and fulfill customer orders
6. **Analytics**: Monitor performance and generate reports

### Product Customization Flow
1. **Select Product**: Choose base product for customization
2. **Upload Design**: Upload custom images or choose from templates
3. **Position & Scale**: Drag and drop to position design elements
4. **Preview**: Real-time preview of customized product
5. **Add to Cart**: Add customized product with design specifications
6. **Checkout**: Complete purchase with customization details

## 🛠️ Setup

1. **Install dependencies**
```bash
npm install
```

2. **Run development server**
```bash
npm run dev
```

3. **Build for production**
```bash
npm run build
```

## 📁 Project Structure

```
src/
├── admin/                 # Admin panel components and pages
├── components/            # Shared UI components
├── ecommerce/            # E-commerce specific components
│   ├── components/       # Product, cart, checkout components
│   ├── context/         # State management contexts
│   └── routes/          # E-commerce pages
├── shared/              # Shared utilities and services
└── styles/              # Global styles and Tailwind config
```

## 🔧 Configuration

- **Environment Variables**: Configure API endpoints and feature flags
- **Tailwind CSS**: Custom configuration for design system
- **TypeScript**: Strict type checking and configuration
- **Vite**: Fast development and build tooling