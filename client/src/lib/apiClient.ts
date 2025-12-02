import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Create axios instance with base configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for session-based auth
});

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // No need to add JWT token manually - it's sent via HTTP-only cookies automatically

    // Add timestamp for cache busting if needed
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }

    // Log request in development
    if (import.meta.env.MODE === 'development') {
      console.log(`🔄 ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params);
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful response in development
    if (import.meta.env.MODE === 'development') {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }

    return response;
  },
  (error: AxiosError) => {
    // Handle different error scenarios
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - redirect to login or clear session
          console.warn('Unauthorized access - redirecting to login');
          // Store the current route to redirect back after login
          if (window.location.pathname !== '/login') {
            localStorage.setItem('intendedRoute', window.location.pathname);
            window.location.href = '/login';
          }
          // Clear any stored auth data
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('requires2FA');
          localStorage.removeItem('adminData');
          break;
        
        case 403:
          // Forbidden - show appropriate message
          console.warn('Access forbidden:', data);
          break;
        
        case 404:
          // Not found
          console.warn('Resource not found:', error.config?.url);
          break;
        
        case 500:
          // Server error
          console.error('Server error:', data);
          break;
        
        default:
          console.error(`HTTP ${status} Error:`, data);
      }

      // Return formatted error for consistent handling
      return Promise.reject({
        status,
        message: (data as any)?.error || (data as any)?.message || 'An error occurred',
        details: (data as any)?.details,
        originalError: error
      });
    } else if (error.request) {
      // Network error
      console.error('Network Error:', error.request);
      return Promise.reject({
        status: 0,
        message: 'Network error - please check your connection',
        originalError: error
      });
    } else {
      // Request setup error
      console.error('Request Setup Error:', error.message);
      return Promise.reject({
        status: -1,
        message: error.message,
        originalError: error
      });
    }
  }
);

// API request methods
export const apiRequest = {
  // GET request
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.get<T>(url, config);
    return response.data;
  },

  // POST request
  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.post<T>(url, data, config);
    return response.data;
  },

  // PUT request
  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.put<T>(url, data, config);
    return response.data;
  },

  // PATCH request
  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.patch<T>(url, data, config);
    return response.data;
  },

  // DELETE request
  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.delete<T>(url, config);
    return response.data;
  }
};

// Export the axios instance for advanced use cases
export { apiClient };

// Export default
export default apiRequest;