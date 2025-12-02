import { QueryClient } from "@tanstack/react-query";
import { apiRequest as apiClientRequest } from "./apiClient";

// Create and configure the query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status && error.status >= 400 && error.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      refetchOnWindowFocus: false, // Disable refetch on window focus for better UX
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

// Export the real API request function for mutations
export const apiRequest = {
  get: apiClientRequest.get,
  post: apiClientRequest.post,
  put: apiClientRequest.put,
  patch: apiClientRequest.patch,
  delete: apiClientRequest.delete,
};

// Default query function using the API client
export const getQueryFn = <T = any>() => 
  async ({ queryKey }: { queryKey: readonly unknown[] }): Promise<T> => {
    const url = queryKey.join("/") as string;
    return await apiClientRequest.get<T>(url);
  };

// Set the default query function
queryClient.setQueryDefaults([], {
  queryFn: getQueryFn()
});

// Export the configured query client as default
export default queryClient;