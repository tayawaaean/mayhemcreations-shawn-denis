import React, { useState, useEffect } from 'react'
import ProductGrid from '../components/ProductGrid'
import { Filter, Grid, List } from 'lucide-react'
import Button from '../../components/Button'
import CollapsibleDropdown, { DropdownItem } from '../../components/CollapsibleDropdown'
import { useSearchParams } from 'react-router-dom'
import { categoryApiService, Category } from '../../shared/categoryApiService'
import { productApiService, Product } from '../../shared/productApiService'

export default function Products() {
  const [searchParams] = useSearchParams()
  const [sortBy, setSortBy] = useState('featured')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryDropdownItems, setCategoryDropdownItems] = useState<DropdownItem[]>([])
  const [subcategoryDropdownItems, setSubcategoryDropdownItems] = useState<DropdownItem[]>([])

  // Transform categories to dropdown format
  const transformCategoriesToDropdown = (categories: Category[]): DropdownItem[] => {
    return [
      {
        id: 'all',
        label: 'All Products',
        value: ''
      },
      ...(categories || []).map(category => ({
        id: category.id.toString(),
        label: category.name,
        value: category.slug,
        children: category.children?.map(child => ({
          id: child.id.toString(),
          label: child.name,
          value: child.slug
        })) || []
      }))
    ]
  }

  // Update subcategory dropdown when category changes
  useEffect(() => {
    if (selectedCategory) {
      const selectedCategoryData = categories.find(cat => cat.slug === selectedCategory)
      if (selectedCategoryData?.children) {
        setSubcategoryDropdownItems([
          {
            id: 'all',
            label: `All ${selectedCategoryData.name}`,
            value: ''
          },
          ...selectedCategoryData.children.map(child => ({
            id: child.id.toString(),
            label: child.name,
            value: child.slug
          }))
        ])
      } else {
        setSubcategoryDropdownItems([])
      }
    } else {
      setSubcategoryDropdownItems([])
    }
  }, [selectedCategory, categories])

  // Fetch categories and products from database
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const [categoriesResponse, productsResponse] = await Promise.all([
          categoryApiService.getCategories({
            includeChildren: true,
            status: 'active',
            sortBy: 'sortOrder',
            sortOrder: 'ASC'
          }),
          productApiService.getProducts({
            status: 'active',
            limit: 50
          })
        ])
        
        console.log('API Responses:', { categoriesResponse, productsResponse })
        console.log('Products with images:', productsResponse.data?.map(p => {
          let parsedImages = p.images
          if (typeof p.images === 'string') {
            try {
              parsedImages = JSON.parse(p.images)
            } catch (e) {
              parsedImages = []
            }
          }
          return {
            id: p.id,
            title: p.title,
            image: p.image,
            images: parsedImages,
            primaryImageIndex: p.primaryImageIndex
          }
        }))
        setCategories(categoriesResponse.data || [])
        setProducts(productsResponse.data || [])
        setCategoryDropdownItems(transformCategoriesToDropdown(categoriesResponse.data || []))
      } catch (err) {
        setError('Failed to load data')
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

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
    setSelectedSubcategory(null)
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
    const url = new URL(window.location.href)
    if (subcategory) {
      url.searchParams.set('subcategory', subcategory)
    } else {
      url.searchParams.delete('subcategory')
    }
    window.history.replaceState({}, '', url.toString())
  }

  // Transform database products to frontend Product type
  const transformedProducts = (products || []).map(product => {
    // Calculate total stock from variants
    const totalStock = product.variants?.reduce((sum: number, variant: any) => sum + (variant.stock || 0), 0) || 0
    
    return {
      id: product.id.toString(),
      title: product.title,
      price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
      description: product.description,
      image: product.image,
      alt: product.alt,
      badges: [],
      category: product.category?.slug as 'apparel' | 'accessories' | 'embroidery' || 'apparel',
      subcategory: product.subcategory?.slug,
      availableColors: [],
      availableSizes: [],
      materials: [],
      averageRating: 0,
      totalReviews: 0,
      stock: totalStock, // Use calculated stock from variants
      sku: product.sku,
      status: product.status,
      hasSizing: product.hasSizing,
      variants: product.variants || [] // Include variants for detailed stock info
    }
  })

  // Filter and sort products
  const filteredProducts = transformedProducts
    .filter(product => {
      if (selectedCategory && product.category !== selectedCategory) {
        return false
      }
      if (selectedSubcategory && product.subcategory !== selectedSubcategory) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      // Always prioritize products with stock first
      const aHasStock = (a.stock || 0) > 0
      const bHasStock = (b.stock || 0) > 0
      
      if (aHasStock && !bHasStock) return -1
      if (!aHasStock && bHasStock) return 1
      
      // If both have same stock status, apply normal sorting
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price
        case 'price-high':
          return b.price - a.price
        case 'newest':
          return parseInt(b.id) - parseInt(a.id)
        case 'popular':
          return (b.totalReviews || 0) - (a.totalReviews || 0)
        case 'stock-high':
          return (b.stock || 0) - (a.stock || 0)
        case 'featured':
        default:
          return parseInt(b.id) - parseInt(a.id)
      }
    })

  if (loading) {
    return (
      <main className="py-8">
        <div className="container">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="py-8">
      <div className="container">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {selectedSubcategory 
                  ? selectedSubcategory.charAt(0).toUpperCase() + selectedSubcategory.slice(1)
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

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Sort */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Mobile Filter Button */}
            <div className="lg:hidden">
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="w-full"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters {showFilters ? '(Hide)' : ''}
              </Button>
            </div>

            {/* Desktop Filters */}
            <div className="hidden lg:flex items-center space-x-6 flex-1">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Category:</label>
                <CollapsibleDropdown
                  items={categoryDropdownItems}
                  selectedValue={selectedCategory || ''}
                  onSelect={(value) => handleCategoryChange(value || null)}
                  placeholder="All Products"
                  className="min-w-[160px]"
                  maxHeight="250px"
                  showSearch={true}
                  searchPlaceholder="Search categories..."
                />
              </div>
              
              {/* Subcategory Filter */}
              {selectedCategory && subcategoryDropdownItems.length > 0 && (
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Type:</label>
                  <CollapsibleDropdown
                    items={subcategoryDropdownItems}
                    selectedValue={selectedSubcategory || ''}
                    onSelect={(value) => handleSubcategoryChange(value || null)}
                    placeholder={`All ${categories.find(cat => cat.slug === selectedCategory)?.name || 'Products'}`}
                    className="min-w-[160px]"
                    maxHeight="200px"
                    showSearch={true}
                    searchPlaceholder="Search types..."
                  />
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
                  <option value="stock-high">Stock: High to Low</option>
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
                <CollapsibleDropdown
                  items={categoryDropdownItems}
                  selectedValue={selectedCategory || ''}
                  onSelect={(value) => handleCategoryChange(value || null)}
                  placeholder="All Products"
                  className="w-full"
                  maxHeight="200px"
                  showSearch={true}
                  searchPlaceholder="Search categories..."
                />
              </div>
              
              {/* Mobile Subcategory Filter */}
              {selectedCategory && subcategoryDropdownItems.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Type</label>
                  <CollapsibleDropdown
                    items={subcategoryDropdownItems}
                    selectedValue={selectedSubcategory || ''}
                    onSelect={(value) => handleSubcategoryChange(value || null)}
                    placeholder={`All ${categories.find(cat => cat.slug === selectedCategory)?.name || 'Products'}`}
                    className="w-full"
                    maxHeight="200px"
                    showSearch={true}
                    searchPlaceholder="Search types..."
                  />
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
                  <option value="stock-high">Stock: High to Low</option>
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
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold text-gray-900">${product.price.toFixed(2)}</div>
                            {product.stock !== undefined && (
                              <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  product.stock === 0 
                                    ? 'bg-red-500' 
                                    : product.stock <= 5 
                                      ? 'bg-yellow-500' 
                                      : 'bg-green-500'
                                }`}></div>
                                <span className={`text-sm font-medium ${
                                  product.stock === 0 
                                    ? 'text-red-600' 
                                    : product.stock <= 5 
                                      ? 'text-yellow-600' 
                                      : 'text-green-600'
                                }`}>
                                  {product.stock === 0 ? 'Out of Stock' : `${product.stock} in stock`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-6">
                          <Button
                            variant={product.stock === 0 ? "outline" : "add-to-cart"}
                            size="md"
                            className="group"
                            disabled={product.stock === 0}
                            onClick={() => product.stock !== 0 && (window.location.href = `/customize/${product.id}`)}
                          >
                            {product.stock === 0 ? 'Out of Stock' : 'Start Customizing'}
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
