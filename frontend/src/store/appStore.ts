import { create } from 'zustand';
import type { FilterOptions, Object, Pagination } from '../types';

interface AppState {
  // Filters
  filters: FilterOptions;
  setFilters: (filters: Partial<FilterOptions>) => void;
  resetFilters: () => void;
  
  // Objects
  objects: Object[];
  setObjects: (objects: Object[]) => void;
  addObjects: (objects: Object[]) => void;
  
  // Pagination
  pagination: Pagination;
  setPagination: (pagination: Partial<Pagination>) => void;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Selected object
  selectedObject: Object | null;
  setSelectedObject: (object: Object | null) => void;
  
  // View mode
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}

const defaultFilters: FilterOptions = {
  search: '',
  classification: '',
  department: '',
  artist: '',
  beginYear: null,
  endYear: null,
  medium: '',
};

const defaultPagination: Pagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

export const useAppStore = create<AppState>((set) => ({
  // Filters
  filters: defaultFilters,
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  resetFilters: () => set({ filters: defaultFilters }),
  
  // Objects
  objects: [],
  setObjects: (objects) => set({ objects }),
  addObjects: (newObjects) =>
    set((state) => ({ objects: [...state.objects, ...newObjects] })),
  
  // Pagination
  pagination: defaultPagination,
  setPagination: (newPagination) =>
    set((state) => ({
      pagination: { ...state.pagination, ...newPagination },
    })),
  
  // Loading states
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  // Selected object
  selectedObject: null,
  setSelectedObject: (object) => set({ selectedObject: object }),
  
  // View mode
  viewMode: 'grid',
  setViewMode: (mode) => set({ viewMode: mode }),
}));
