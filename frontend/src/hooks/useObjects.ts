import { useEffect, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { useAppStore } from '../store/appStore';
import { objectsApi } from '../services/api';

export function useObjects() {
  const {
    objects,
    setObjects,
    addObjects,
    pagination,
    setPagination,
    filters,
    setFilters,
    resetFilters,
    isLoading,
    setIsLoading,
  } = useAppStore();
  
  const { ref, inView } = useInView();
  const [error, setError] = useState<string | null>(null);
  
  const fetchObjects = useCallback(
    async (reset: boolean = false) => {
      if (isLoading) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const page = reset ? 1 : pagination.page;
        const response = await objectsApi.getList(filters, page, pagination.limit);
        
        if (reset) {
          setObjects(response.data);
        } else {
          addObjects(response.data);
        }
        
        setPagination({
          page: response.pagination.page,
          limit: response.pagination.limit,
          total: response.pagination.total,
          totalPages: response.pagination.totalPages,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch objects');
        console.error('Error fetching objects:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [filters, pagination.page, pagination.limit, isLoading, addObjects, setObjects, setPagination, setIsLoading]
  );
  
  // Initial fetch
  useEffect(() => {
    fetchObjects(true);
  }, [filters]);
  
  // Load more when scrolling
  useEffect(() => {
    if (inView && !isLoading && pagination.page < pagination.totalPages) {
      setPagination({ page: pagination.page + 1 });
      fetchObjects(false);
    }
  }, [inView, isLoading, pagination.page, pagination.totalPages, fetchObjects, setPagination]);
  
  return {
    objects,
    pagination,
    isLoading,
    error,
    ref,
    refresh: () => fetchObjects(true),
    setFilters,
    resetFilters,
  };
}
