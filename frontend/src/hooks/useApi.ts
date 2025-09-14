import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { ApiError } from '../services';

// Generic hook for GET requests
export function useApiQuery<T>(
  key: string | readonly unknown[],
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn,
    ...options,
  });
}

// Generic hook for mutations (POST, PUT, PATCH, DELETE)
export function useApiMutation<T, V = unknown>(
  mutationFn: (variables: V) => Promise<T>,
  options?: Omit<UseMutationOptions<T, ApiError, V>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn,
    onSuccess: (data, variables, context) => {
      // Invalidate and refetch queries after successful mutation
      queryClient.invalidateQueries();
      
      // Call the provided onSuccess if it exists
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

// Hook specifically for invalidating queries
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => queryClient.invalidateQueries(),
    invalidateQuery: (key: string | readonly unknown[]) => {
      const queryKey = Array.isArray(key) ? key : [key];
      queryClient.invalidateQueries({ queryKey });
    },
    refetchQuery: (key: string | readonly unknown[]) => {
      const queryKey = Array.isArray(key) ? key : [key];
      queryClient.refetchQueries({ queryKey });
    },
  };
}