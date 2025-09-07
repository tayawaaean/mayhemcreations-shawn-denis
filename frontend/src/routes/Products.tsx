import React, { useState, useEffect } from 'react'
import ProductGrid from '../components/ProductGrid'
import { products } from '../data/products'
import { Filter, SortAsc, Grid, List, ShoppingCart, ArrowRight } from 'lucide-react'
import Button from '../components/Button'
import { useSearchParams } from 'react-router-dom'

export default function Products() {
  const [searchParams] = useSearchParams()
  const [sortBy, setSortBy] = useState('featured')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)

  // Get category and subcategory from URL params
  useEffect(() => {
    const category = searchParams.get('category')
    const subcategory = searchParams.get('subcategory')
    setSelectedCategory(category)
    setSelectedSubcategory(subcategory)
  }, [searchParams])

  // Update URL when category changes
  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category)
    setSelectedSubcategory(null) // Reset subcategory when category changes
    // Update URL without page reload
    const url = new URL(window.location.href)
    if (category) {
      url.searchParams.set('category', category)
    } else {
      url.searchParams.delete('category')
    }
    url.searchParams.delete('subcategory')
    window.history.replaceState({}, '', url.toString())
  }

  // Update URL when subcategory changes
  const handleSubcategoryChange = (subcategory: string | null) => {
    setSelectedSubcategory(subcategory)
    // Update URL without page reload
    const url = new URL(window.location.href)
    if (subcategory) {
      url.searchParams.set('subcategory', subcategory)
    } else {
      url.searchParams.delete('subcategory')
    }
    window.history.replaceState({}, '', url.toString())
  }

  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      if (selectedCategory && product.category !== selectedCategory) return false
      if (selectedSubcategory && product.subcategory !== selectedSubcategory) return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price
        case 'price-high':
          return b.price - a.price
        case 'newest':
          // Assuming newer products have higher IDs or we could add a date field
          return b.id.localeCompare(a.id)
        case 'popular':
          // Assuming products with badges are more popular
          const aPopularity = (a.badges?.length || 0) + (a.title.includes('Classic') ? 1 : 0)
          const bPopularity = (b.badges?.length || 0) + (b.title.includes('Classic') ? 1 : 0)
          return bPopularity - aPopularity
        case 'featured':
        default:
          // Keep original order for featured
          return 0
      }
    })

  return (
    <main className="py-8">
      <div className="container">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {selectedSubcategory 
                  ? selectedSubcategory.charAt(0).toUpperCase() + selectedSubcategory.slice(1).replace(/([A-Z])/g, ' $1')
                  : selectedCategory 
                    ? selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)
                    : 'All Products'
                }
              </h1>
              <p className="text-lg text-gray-600">
                {selectedSubcategory 
                  ? `Browse our ${selectedSubcategory} collection`
                  : selectedCategory 
                    ? `Browse our ${selectedCategory} collection`
                    : 'Browse our complete collection of custom embroidered products'
                }
              </p>
            </div>
            {(selectedCategory || selectedSubcategory) && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  handleCategoryChange(null)
                  handleSubcategoryChange(null)
                }}
              >
                Clear Filter
              </Button>
            )}
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Mobile Filter Button */}
            <div className="lg:hidden">
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="w-full"
                icon={<Filter className="w-4 h-4" />}
                iconPosition="left"
              >
                Filters {showFilters ? '(Hide)' : ''}
              </Button>
            </div>

            {/* Desktop Filters */}
            <div className="hidden lg:flex items-center space-x-6 flex-1">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Category:</label>
                <select 
                  value={selectedCategory || ''} 
                  onChange={(e) => handleCategoryChange(e.target.value || null)}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent bg-white min-w-[140px]"
                >
                  <option value="">All Products</option>
                  <option value="apparel">Apparel</option>
                  <option value="accessories">Accessories</option>
                  <option value="embroidery">Embroidery</option>
                </select>
              </div>
              
              {/* Subcategory Filter */}
              {selectedCategory && (
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Type:</label>
                  <select 
                    value={selectedSubcategory || ''} 
                    onChange={(e) => handleSubcategoryChange(e.target.value || null)}
                    className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent bg-white min-w-[140px]"
                  >
                    <option value="">All {selectedCategory}</option>
                    {selectedCategory === 'apparel' && (
                      <>
                        <option value="tshirt">T-Shirts</option>
                        <option value="poloshirt">Polo Shirts</option>
                        <option value="hoodie">Hoodies</option>
                      </>
                    )}
                    {selectedCategory === 'accessories' && (
                      <>
                        <option value="cap">Caps</option>
                        <option value="bag">Bags</option>
                      </>
                    )}
                  </select>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Sort by:</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent bg-white min-w-[160px]"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="newest">Newest</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
            </div>

            {/* View Mode Toggle and Results Count */}
            <div className="flex items-center justify-between lg:justify-end space-x-4">
              <div className="text-sm text-gray-600 font-medium">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
              </div>
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    viewMode === 'grid' 
                      ? 'bg-white text-accent shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Grid view"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    viewMode === 'list' 
                      ? 'bg-white text-accent shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Filters Panel */}
        {showFilters && (
          <div className="lg:hidden mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Category</label>
                <select 
                  value={selectedCategory || ''} 
                  onChange={(e) => handleCategoryChange(e.target.value || null)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent bg-white"
                >
                  <option value="">All Products</option>
                  <option value="apparel">Apparel</option>
                  <option value="accessories">Accessories</option>
                  <option value="embroidery">Embroidery</option>
                </select>
              </div>
              
              {/* Mobile Subcategory Filter */}
              {selectedCategory && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Type</label>
                  <select 
                    value={selectedSubcategory || ''} 
                    onChange={(e) => handleSubcategoryChange(e.target.value || null)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent bg-white"
                  >
                    <option value="">All {selectedCategory}</option>
                    {selectedCategory === 'apparel' && (
                      <>
                        <option value="tshirt">T-Shirts</option>
                        <option value="poloshirt">Polo Shirts</option>
                        <option value="hoodie">Hoodies</option>
                      </>
                    )}
                    {selectedCategory === 'accessories' && (
                      <>
                        <option value="cap">Caps</option>
                        <option value="bag">Bags</option>
                      </>
                    )}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Sort by</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent bg-white"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="newest">Newest</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {viewMode === 'grid' ? (
          <ProductGrid products={filteredProducts} />
        ) : (
          <div className="space-y-6">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-600">Try adjusting your filters or search terms to find what you're looking for.</p>
                </div>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden">
                  <div className="flex items-center space-x-6 p-6">
                    <div className="flex-shrink-0">
                      <img 
                        src={product.image} 
                        alt={product.alt} 
                        className="w-24 h-24 object-cover rounded-lg shadow-sm" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-accent transition-colors">
                            {product.title}
                          </h3>
                          <p className="text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                          <div className="flex items-center space-x-4">
                            <div className="text-2xl font-bold text-gray-900">${product.price.toFixed(2)}</div>
                            {product.badges && product.badges.length > 0 && (
                              <div className="flex space-x-2">
                                {product.badges.slice(0, 2).map((badge, index) => (
                                  <span 
                                    key={index}
                                    className="px-2 py-1 text-xs font-medium bg-accent text-white rounded-full"
                                  >
                                    {badge}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-6">
                          <Button
                            variant="add-to-cart"
                            size="md"
                            className="group"
                            onClick={() => window.location.href = `/customize/${product.id}`}
                          >
                            Start Customizing
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  )
}
