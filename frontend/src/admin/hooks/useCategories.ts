import { useState, useEffect, useCallback, useRef } from 'react';
import { categoryApiService, Category, CategoryCreateData, CategoryUpdateData, CategoryFilters } from '../../shared/categoryApiService';

export interface UseCategoriesReturn {
  categories: Category[];
  loading: boolean;
  error: string | null;
  stats: {
    total: number;
    active: number;
    inactive: number;
    rootCategories: number;
    categoriesWithChildren: number;
  } | null;
  // Actions
  fetchCategories: (filters?: CategoryFilters) => Promise<void>;
  fetchCategoryById: (id: number) => Promise<Category | null>;
  createCategory: (categoryData: CategoryCreateData) => Promise<Category | null>;
  updateCategory: (id: number, categoryData: CategoryUpdateData) => Promise<Category | null>;
  deleteCategory: (id: number, force?: boolean) => Promise<boolean>;
  fetchStats: () => Promise<void>;
  searchCategories: (query: string) => Promise<Category[]>;
  getRootCategories: () => Promise<Category[]>;
  getActiveCategories: () => Promise<Category[]>;
  // Local state management
  addCategoryToLocal: (category: Category) => void;
  updateCategoryInLocal: (category: Category) => void;
  removeCategoryFromLocal: (id: number) => void;
}

export const useCategories = (initialFilters?: CategoryFilters): UseCategoriesReturn => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    active: number;
    inactive: number;
    rootCategories: number;
    categoriesWithChildren: number;
  } | null>(null);
  
  // Request throttling and debouncing
  const requestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRequestingRef = useRef(false);
  const lastRequestTimeRef = useRef<number>(0);

  // Fetch categories with filters and throttling
  const fetchCategories = useCallback(async (filters?: CategoryFilters) => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    
    // Prevent requests if one is already in progress
    if (isRequestingRef.current) {
      return;
    }
    
    // If less than 500ms since last request, debounce it
    if (timeSinceLastRequest < 500) {
      // Clear any existing timeout
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
      
      return new Promise<void>((resolve) => {
        requestTimeoutRef.current = setTimeout(async () => {
          await fetchCategories(filters);
          resolve();
        }, 500 - timeSinceLastRequest);
      });
    }
    
    try {
      isRequestingRef.current = true;
      lastRequestTimeRef.current = now;
      setLoading(true);
      setError(null);
      
      const response = await categoryApiService.getCategories(filters || initialFilters);
      
      if (response.success) {
        setCategories(response.data);
      } else {
        throw new Error('Failed to fetch categories');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories';
      setError(errorMessage);
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
      isRequestingRef.current = false;
    }
  }, [initialFilters]);

  // Fetch single category by ID
  const fetchCategoryById = useCallback(async (id: number): Promise<Category | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await categoryApiService.getCategoryById(id);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error('Failed to fetch category');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch category';
      setError(errorMessage);
      console.error('Error fetching category:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new category
  const createCategory = useCallback(async (categoryData: CategoryCreateData): Promise<Category | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await categoryApiService.createCategory(categoryData);
      
      if (response.success && response.data) {
        const newCategory = response.data;
        setCategories(prev => [...prev, newCategory]);
        return newCategory;
      } else {
        const errorMessage = response.message || 'Failed to create category';
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create category';
      setError(errorMessage);
      console.error('Error creating category:', err);
      console.error('Category data that failed:', categoryData);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update category
  const updateCategory = useCallback(async (id: number, categoryData: CategoryUpdateData): Promise<Category | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await categoryApiService.updateCategory(id, categoryData);
      
      if (response.success) {
        const updatedCategory = response.data;
        setCategories(prev => 
          prev.map(cat => cat.id === id ? updatedCategory : cat)
        );
        return updatedCategory;
      } else {
        throw new Error('Failed to update category');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update category';
      setError(errorMessage);
      console.error('Error updating category:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete category
  const deleteCategory = useCallback(async (id: number, force: boolean = false): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await categoryApiService.deleteCategory(id, force);
      
      if (response.success) {
        setCategories(prev => prev.filter(cat => cat.id !== id));
        return true;
      } else {
        throw new Error('Failed to delete category');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete category';
      setError(errorMessage);
      console.error('Error deleting category:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch category statistics with throttling
  const fetchStats = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    
    // Prevent requests if one is already in progress
    if (isRequestingRef.current) {
      return;
    }
    
    // If less than 500ms since last request, debounce it
    if (timeSinceLastRequest < 500) {
      // Clear any existing timeout
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
      
      return new Promise<void>((resolve) => {
        requestTimeoutRef.current = setTimeout(async () => {
          await fetchStats();
          resolve();
        }, 500 - timeSinceLastRequest);
      });
    }
    
    try {
      isRequestingRef.current = true;
      lastRequestTimeRef.current = now;
      setError(null);
      
      const response = await categoryApiService.getCategoryStats();
      
      if (response.success) {
        setStats(response.data);
      } else {
        throw new Error('Failed to fetch category stats');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch category stats';
      setError(errorMessage);
      console.error('Error fetching category stats:', err);
    } finally {
      isRequestingRef.current = false;
    }
  }, []);

  // Search categories
  const searchCategories = useCallback(async (query: string): Promise<Category[]> => {
    try {
      setError(null);
      
      const results = await categoryApiService.searchCategories(query);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search categories';
      setError(errorMessage);
      console.error('Error searching categories:', err);
      return [];
    }
  }, []);

  // Get root categories
  const getRootCategories = useCallback(async (): Promise<Category[]> => {
    try {
      setError(null);
      
      const results = await categoryApiService.getRootCategories();
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch root categories';
      setError(errorMessage);
      console.error('Error fetching root categories:', err);
      return [];
    }
  }, []);

  // Get active categories
  const getActiveCategories = useCallback(async (): Promise<Category[]> => {
    try {
      setError(null);
      
      const results = await categoryApiService.getActiveCategories();
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch active categories';
      setError(errorMessage);
      console.error('Error fetching active categories:', err);
      return [];
    }
  }, []);

  // Local state management helpers
  const addCategoryToLocal = useCallback((category: Category) => {
    setCategories(prev => [...prev, category]);
  }, []);

  const updateCategoryInLocal = useCallback((category: Category) => {
    setCategories(prev => 
      prev.map(cat => cat.id === category.id ? category : cat)
    );
  }, []);

  const removeCategoryFromLocal = useCallback((id: number) => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
  }, []);

  // Load initial data - only run once on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch both categories and stats in parallel but with a small delay
        const [categoriesResponse, statsResponse] = await Promise.all([
          categoryApiService.getCategories(initialFilters),
          categoryApiService.getCategoryStats()
        ]);
        
        if (categoriesResponse.success) {
          setCategories(categoriesResponse.data);
        } else {
          throw new Error('Failed to fetch categories');
        }
        
        if (statsResponse.success) {
          setStats(statsResponse.data);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
        console.error('Error loading initial data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
    
    // Cleanup function to clear timeouts
    return () => {
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - only run once

  return {
    categories,
    loading,
    error,
    stats,
    fetchCategories,
    fetchCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchStats,
    searchCategories,
    getRootCategories,
    getActiveCategories,
    addCategoryToLocal,
    updateCategoryInLocal,
    removeCategoryFromLocal,
  };
};
