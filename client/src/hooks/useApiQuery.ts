import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';

// Generic GET hook
export function useApiQuery<T = any>(
  queryKey: string | string[],
  endpoint?: string,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  const finalEndpoint = endpoint || (Array.isArray(queryKey) ? queryKey.join('/') : queryKey);
  
  return useQuery<T>({
    queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
    queryFn: () => apiRequest.get<T>(finalEndpoint),
    ...options
  });
}

// Generic POST mutation hook
export function useApiMutation<TData = any, TVariables = any>(
  endpoint: string,
  options?: UseMutationOptions<TData, any, TVariables>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, any, TVariables>({
    mutationFn: (data: TVariables) => apiRequest.post<TData>(endpoint, data),
    onSuccess: (data, variables, context) => {
      // Invalidate related queries by default
      queryClient.invalidateQueries({ 
        queryKey: [endpoint.split('/')[1] || endpoint] 
      });
      
      // Call custom onSuccess if provided
      options?.onSuccess?.(data, variables, context);
    },
    ...options
  });
}

// Generic PUT mutation hook
export function useApiPutMutation<TData = any, TVariables = any>(
  endpoint: string,
  options?: UseMutationOptions<TData, any, TVariables>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, any, TVariables>({
    mutationFn: (data: TVariables) => apiRequest.put<TData>(endpoint, data),
    onSuccess: (data, variables, context) => {
      // Invalidate related queries by default
      queryClient.invalidateQueries({ 
        queryKey: [endpoint.split('/')[1] || endpoint] 
      });
      
      // Call custom onSuccess if provided
      options?.onSuccess?.(data, variables, context);
    },
    ...options
  });
}

// Generic DELETE mutation hook
export function useApiDeleteMutation<TData = any, TVariables = any>(
  endpoint: string,
  options?: UseMutationOptions<TData, any, TVariables>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, any, TVariables>({
    mutationFn: (id: TVariables) => apiRequest.delete<TData>(`${endpoint}/${id}`),
    onSuccess: (data, variables, context) => {
      // Invalidate related queries by default
      queryClient.invalidateQueries({ 
        queryKey: [endpoint.split('/')[1] || endpoint] 
      });
      
      // Call custom onSuccess if provided
      options?.onSuccess?.(data, variables, context);
    },
    ...options
  });
}

// Generic PATCH mutation hook
export function useApiPatchMutation<TData = any, TVariables = any>(
  endpoint: string,
  options?: UseMutationOptions<TData, any, TVariables>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, any, TVariables>({
    mutationFn: (data: TVariables) => apiRequest.patch<TData>(endpoint, data),
    onSuccess: (data, variables, context) => {
      // Invalidate related queries by default
      queryClient.invalidateQueries({ 
        queryKey: [endpoint.split('/')[1] || endpoint] 
      });
      
      // Call custom onSuccess if provided
      options?.onSuccess?.(data, variables, context);
    },
    ...options
  });
}