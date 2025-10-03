# Multi-Image Product Seeder

This seeder populates the database with products that have multiple images to demonstrate the new slideshow functionality in the ecommerce section.

## Features

- **Multiple Images per Product**: Each product has 3-5 different images showing various angles and details
- **Primary Image Selection**: Each product has a designated primary image that appears first
- **Backward Compatibility**: Maintains compatibility with existing single-image products
- **Rich Product Data**: Includes detailed product information with proper categorization

## Seeded Products

The seeder creates 8 products across different categories:

### Apparel
1. **Premium Embroidered Tee - Multi View** (4 images)
   - Shows front, back, side, and detail views
   - Available in 6 colors and 6 sizes

2. **Classic Hoodie Collection** (5 images)
   - Multiple angles and styling options
   - Available in 5 colors and 5 sizes

3. **Executive Polo Shirt** (3 images)
   - Professional polo with detailed embroidery
   - Available in 5 colors and 5 sizes

4. **Long Sleeve Premium Tee** (3 images)
   - Premium long sleeve with embroidery
   - Available in 6 colors and 5 sizes

### Accessories
5. **Signature Cap Collection** (4 images)
   - Various cap styles and embroidery designs
   - Available in 5 colors, one size

6. **Eco-Friendly Tote Bag** (3 images)
   - Sustainable canvas tote with reinforced handles
   - Available in 5 colors, one size

7. **Designer Crossbody Bag** (4 images)
   - Stylish crossbody with multiple views
   - Available in 4 colors, one size

### Embroidery
8. **Custom Patch Collection** (5 images)
   - Various patch designs and sizes
   - Available in multiple sizes

## Usage

### Basic Seeding
```bash
# Seed multi-image products
npm run seed:multi-image-products

# Clear existing multi-image products and seed new ones
npm run seed:multi-image-products -- --clear

# Update existing single-image products with image arrays
npm run seed:multi-image-products -- --update-existing
```

### Using the Main Seeder
```bash
# Seed only multi-image products
npm run seed -- --multi-image-products-only

# Clear and seed multi-image products
npm run seed -- --multi-image-products-only --clear

# Update existing products
npm run seed -- --update-existing-products
```

### Direct CLI Usage
```bash
# Using the main seeder index
node -r ts-node/register src/seeders/index.ts --multi-image-products-only
node -r ts-node/register src/seeders/index.ts --multi-image-products-only --clear
node -r ts-node/register src/seeders/index.ts --update-existing-products

# Using the dedicated script
node -r ts-node/register src/seeders/seedMultiImageProducts.ts
node -r ts-node/register src/seeders/seedMultiImageProducts.ts --clear
node -r ts-node/register src/seeders/seedMultiImageProducts.ts --update-existing
```

## Database Schema

The seeder uses the updated Product model with these new fields:

- `images`: JSON array of base64-encoded images
- `primaryImageIndex`: Index of the primary image in the images array
- `image`: Single image field (kept for backward compatibility)

## Image Sources

All images are sourced from Unsplash with proper licensing:
- High-quality product photography
- Various angles and details
- Consistent sizing (400x400px)
- Optimized for web display

## Testing the Slideshow

After seeding, you can test the slideshow functionality:

1. **Product Cards**: Hover over product cards to see auto-play slideshow
2. **Product Page**: Navigate to individual product pages to see full slideshow with thumbnails
3. **Fullscreen Mode**: Click any image to view in fullscreen with navigation
4. **Admin Panel**: Upload multiple images for products using the enhanced admin interface

## Troubleshooting

### Common Issues

1. **Categories Not Found**: Ensure categories are seeded first
   ```bash
   npm run seed -- --categories-only
   ```

2. **Database Connection**: Make sure your database is running and `.env` is configured

3. **Image Loading**: Check that Unsplash URLs are accessible from your network

### Clearing Data

```bash
# Clear only multi-image products
npm run seed -- --clear-multi-image-products

# Clear all products
npm run seed -- --clear-products

# Clear all data
npm run seed -- --clear-all
```

## Development Notes

- Images are stored as base64 strings in the database
- The seeder automatically handles category and subcategory mapping
- All products are set to 'active' status and are featured
- Stock levels and pricing are realistic for testing
- SKUs follow a consistent naming pattern

## Future Enhancements

- Add more product categories
- Include variant-specific images
- Add image metadata (alt text, captions)
- Implement image optimization
- Add bulk image upload functionality






