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
  (response) => {
    // Return the data directly, but keep the full response structure for debugging
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.message || error.message || 'Unknown error';
    const status = error.response?.status || 0;
    console.error(`[API Error] ${status} ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, message);
    return Promise.reject(error);
  }
);

// Objects API
export const objectsApi = {
  getList: async (
    filters: FilterOptions,
    page: number = 1,
    limit: number = 200,
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
    
    const url = `/api/objects?${params.toString()}`;
    const result = await api.get(url);
    return result as unknown as ObjectListResponse;
  },
  
  getById: async (id: string): Promise<Object> => {
    return api.get(`/api/objects/${id}`) as unknown as Object;
  },
  
  getDetails: async (id: string): Promise<Object> => {
    return api.get(`/api/objects/${id}/details`) as unknown as Object;
  },
  
  getStatistics: async (): Promise<Statistics> => {
    return api.get('/api/objects/statistics') as unknown as Statistics;
  },
  
  getClassifications: async (): Promise<string[]> => {
    return api.get('/api/objects/classifications') as unknown as string[];
  },
  
  getDepartments: async (): Promise<string[]> => {
    return api.get('/api/objects/departments') as unknown as string[];
  },
};

// Images API
export const imagesApi = {
  getFeatured: async (limit: number = 10): Promise<Image[]> => {
    return api.get(`/api/images?limit=${limit}`) as unknown as Image[];
  },
  
  getByUuid: async (uuid: string): Promise<Image> => {
    return api.get(`/api/images/${uuid}`) as unknown as Image;
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
  search: async (query: string, page: number = 1, limit: number = 200): Promise<ObjectListResponse> => {
    return api.get(`/api/search?q=${query}&page=${page}&limit=${limit}`) as unknown as ObjectListResponse;
  },
  
  getSuggestions: async (query: string): Promise<{ title: string; attribution: string }[]> => {
    return api.get(`/api/search/suggestions?q=${query}`) as unknown as { title: string; attribution: string }[];
  },
};

// Analysis API
export const analysisApi = {
  getStatistics: async () => {
    const response = await api.get('/api/analysis/statistics');
    return response as unknown as any; // Using any for flexible statistics type or import StatisticsData
  },
  
  getTimeline: async (startYear?: number, endYear?: number, interval?: string): Promise<TimelineData[]> => {
    const params = new URLSearchParams();
    if (startYear) params.append('startYear', startYear.toString());
    if (endYear) params.append('endYear', endYear.toString());
    if (interval) params.append('interval', interval);
    
    const response = await api.get(`/api/analysis/timeline?${params.toString()}`);
    return response as unknown as TimelineData[];
  },
  
  getArtistNetwork: async (): Promise<NetworkData> => {
    return api.get('/api/analysis/artist-network') as unknown as NetworkData;
  },
  
  getColorDistribution: async () => {
    return api.get('/api/analysis/color-distribution') as unknown as any;
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
