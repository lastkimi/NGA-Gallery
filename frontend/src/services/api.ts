import axios from 'axios';
import type {
  Object,
  ObjectListResponse,
  Image,
  Statistics,
  TimelineData,
  NetworkData,
  FilterOptions,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('[API Error]', error.message);
    return Promise.reject(error);
  }
);

// Objects API
export const objectsApi = {
  getList: async (
    filters: FilterOptions,
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'id',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<ObjectListResponse> => {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.classification) params.append('classification', filters.classification);
    if (filters.department) params.append('department', filters.department);
    if (filters.artist) params.append('artist', filters.artist);
    if (filters.beginYear) params.append('beginYear', filters.beginYear.toString());
    if (filters.endYear) params.append('endYear', filters.endYear.toString());
    if (filters.medium) params.append('medium', filters.medium);
    
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);
    
    return api.get(`/api/objects?${params.toString()}`);
  },
  
  getById: async (id: string): Promise<Object> => {
    return api.get(`/api/objects/${id}`);
  },
  
  getDetails: async (id: string): Promise<Object> => {
    return api.get(`/api/objects/${id}/details`);
  },
  
  getStatistics: async (): Promise<Statistics> => {
    return api.get('/api/objects/statistics');
  },
  
  getClassifications: async (): Promise<string[]> => {
    return api.get('/api/objects/classifications');
  },
  
  getDepartments: async (): Promise<string[]> => {
    return api.get('/api/objects/departments');
  },
};

// Images API
export const imagesApi = {
  getFeatured: async (limit: number = 10): Promise<Image[]> => {
    return api.get(`/api/images?limit=${limit}`);
  },
  
  getByUuid: async (uuid: string): Promise<Image> => {
    return api.get(`/api/images/${uuid}`);
  },
  
  getThumbnail: (uuid: string): string => {
    return `${API_BASE_URL}/api/images/${uuid}/thumbnail`;
  },
  
  getPreview: (uuid: string): string => {
    return `${API_BASE_URL}/api/images/${uuid}/preview`;
  },
  
  getFull: (uuid: string): string => {
    return `${API_BASE_URL}/api/images/${uuid}/full`;
  },
};

// Search API
export const searchApi = {
  search: async (query: string, page: number = 1, limit: number = 20): Promise<ObjectListResponse> => {
    return api.get(`/api/search?q=${query}&page=${page}&limit=${limit}`);
  },
  
  getSuggestions: async (query: string): Promise<{ title: string; attribution: string }[]> => {
    return api.get(`/api/search/suggestions?q=${query}`);
  },
};

// Analysis API
export const analysisApi = {
  getStatistics: async () => {
    return api.get('/api/analysis/statistics');
  },
  
  getTimeline: async (startYear?: number, endYear?: number, interval?: string): Promise<TimelineData[]> => {
    const params = new URLSearchParams();
    if (startYear) params.append('startYear', startYear.toString());
    if (endYear) params.append('endYear', endYear.toString());
    if (interval) params.append('interval', interval);
    
    return api.get(`/api/analysis/timeline?${params.toString()}`);
  },
  
  getArtistNetwork: async (): Promise<NetworkData> => {
    return api.get('/api/analysis/artist-network');
  },
  
  getColorDistribution: async () => {
    return api.get('/api/analysis/color-distribution');
  },
};

// Health API
export const healthApi = {
  check: async () => {
    return api.get('/health');
  },
  
  ready: async () => {
    return api.get('/health/ready');
  },
};

export default api;
