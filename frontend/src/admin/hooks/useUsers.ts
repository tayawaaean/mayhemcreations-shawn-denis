import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService, User, UserListResponse, UserStats } from '../services/apiService';

interface UseUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  role?: string;
  verified?: 'email' | 'phone' | 'both' | 'none' | 'all';
  sortBy?: 'createdAt' | 'updatedAt' | 'firstName' | 'lastName' | 'email' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

interface UseUsersReturn {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateUser: (id: number, userData: Partial<User>) => Promise<boolean>;
  updateUserStatus: (id: number, isActive: boolean) => Promise<boolean>;
  getUserById: (id: number) => Promise<User | null>;
}

export const useUsers = (params: UseUsersParams = {}): UseUsersReturn => {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchUsers = useCallback(async () => {
    if (isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getUsers(params);
      
      if (response.success && response.data) {
        setUsers(response.data.users);
        setPagination(response.data.pagination);
      } else {
        setError(response.message || 'Failed to fetch users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [params]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiService.getUserStats();
      
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
    }
  }, []);

  const refetch = useCallback(async () => {
    isFetchingRef.current = false; // Reset the ref to allow refetch
    await Promise.all([fetchUsers(), fetchStats()]);
  }, [fetchUsers, fetchStats]);

  const updateUser = useCallback(async (id: number, userData: Partial<User>): Promise<boolean> => {
    try {
      const response = await apiService.updateUser(id, userData);
      
      if (response.success && response.data) {
        // Update the user in the local state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === id ? response.data!.user : user
          )
        );
        return true;
      } else {
        setError(response.message || 'Failed to update user');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
      return false;
    }
  }, []);

  const updateUserStatus = useCallback(async (id: number, isActive: boolean): Promise<boolean> => {
    try {
      const response = await apiService.updateUserStatus(id, isActive);
      
      if (response.success && response.data) {
        // Update the user status in the local state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === id ? { ...user, isActive } : user
          )
        );
        return true;
      } else {
        setError(response.message || 'Failed to update user status');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
      return false;
    }
  }, []);

  const getUserById = useCallback(async (id: number): Promise<User | null> => {
    try {
      const response = await apiService.getUserById(id);
      
      if (response.success && response.data) {
        return response.data.user;
      } else {
        setError(response.message || 'Failed to fetch user');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
      return null;
    }
  }, []);

  // Fetch data on mount and when params change
  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    users,
    pagination,
    stats,
    loading,
    error,
    refetch,
    updateUser,
    updateUserStatus,
    getUserById,
  };
};
