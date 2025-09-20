import { useState, useEffect, useCallback } from 'react';
import { faqApiService, FAQ, CreateFAQData, UpdateFAQData } from '../../shared/faqApiService';

export const useFAQs = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch FAQs
  const fetchFAQs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await faqApiService.getFAQs({
        sortBy: 'sortOrder',
        sortOrder: 'ASC'
      });
      
      if (response.success && response.data) {
        setFaqs(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch FAQs');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch FAQs';
      setError(errorMessage);
      console.error('Error fetching FAQs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await faqApiService.getFAQCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('Error fetching FAQ categories:', err);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchFAQs();
    fetchCategories();
  }, [fetchFAQs, fetchCategories]);

  // Create FAQ
  const createFAQ = useCallback(async (faqData: CreateFAQData): Promise<FAQ | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await faqApiService.createFAQ(faqData);
      
      if (response.success && response.data) {
        const newFAQ = response.data;
        setFaqs(prev => [...prev, newFAQ]);
        return newFAQ;
      } else {
        throw new Error(response.message || 'Failed to create FAQ');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create FAQ';
      setError(errorMessage);
      console.error('Error creating FAQ:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update FAQ
  const updateFAQ = useCallback(async (id: number, faqData: UpdateFAQData): Promise<FAQ | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await faqApiService.updateFAQ(id, faqData);
      
      if (response.success && response.data) {
        const updatedFAQ = response.data;
        setFaqs(prev => 
          prev.map(faq => faq.id === id ? updatedFAQ : faq)
        );
        return updatedFAQ;
      } else {
        throw new Error(response.message || 'Failed to update FAQ');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update FAQ';
      setError(errorMessage);
      console.error('Error updating FAQ:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete FAQ
  const deleteFAQ = useCallback(async (id: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await faqApiService.deleteFAQ(id);
      
      if (response.success) {
        setFaqs(prev => prev.filter(faq => faq.id !== id));
        return true;
      } else {
        throw new Error(response.message || 'Failed to delete FAQ');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete FAQ';
      setError(errorMessage);
      console.error('Error deleting FAQ:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle FAQ status
  const toggleFAQStatus = useCallback(async (id: number): Promise<FAQ | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await faqApiService.toggleFAQStatus(id);
      
      if (response.success && response.data) {
        const updatedFAQ = response.data;
        setFaqs(prev => 
          prev.map(faq => faq.id === id ? updatedFAQ : faq)
        );
        return updatedFAQ;
      } else {
        throw new Error(response.message || 'Failed to toggle FAQ status');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle FAQ status';
      setError(errorMessage);
      console.error('Error toggling FAQ status:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update FAQ order
  const updateFAQOrder = useCallback(async (faqUpdates: { id: number; sortOrder: number }[]): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await faqApiService.updateFAQsOrder(faqUpdates);
      
      if (response.success) {
        // Update local state
        setFaqs(prev => {
          const updatedFaqs = [...prev];
          faqUpdates.forEach(update => {
            const faqIndex = updatedFaqs.findIndex(faq => faq.id === update.id);
            if (faqIndex !== -1) {
              updatedFaqs[faqIndex] = { ...updatedFaqs[faqIndex], sortOrder: update.sortOrder };
            }
          });
          return updatedFaqs.sort((a, b) => a.sortOrder - b.sortOrder);
        });
        return true;
      } else {
        throw new Error(response.message || 'Failed to update FAQ order');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update FAQ order';
      setError(errorMessage);
      console.error('Error updating FAQ order:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    faqs,
    categories,
    loading,
    error,
    fetchFAQs,
    createFAQ,
    updateFAQ,
    deleteFAQ,
    toggleFAQStatus,
    updateFAQOrder
  };
};

