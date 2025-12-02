import { useApiQuery, useApiMutation, useApiPutMutation, useApiDeleteMutation } from './useApiQuery';
import { AppUser, InsertAppUser } from '@shared/schema';

// Get all users
export function useUsers() {
  return useApiQuery<AppUser[]>(['users'], '/users');
}

// Get single user
export function useUser(userId: string) {
  return useApiQuery<AppUser>(['users', userId], `/users/${userId}`, {
    enabled: !!userId
  });
}

// Get user transactions
export function useUserTransactions(userId: string) {
  return useApiQuery(['users', userId, 'transactions'], `/users/${userId}/transactions`, {
    enabled: !!userId
  });
}

// Create user mutation
export function useCreateUserMutation() {
  return useApiMutation<AppUser, InsertAppUser>('/users');
}

// Update user mutation
export function useUpdateUserMutation(userId: string) {
  return useApiPutMutation<AppUser, Partial<AppUser>>(`/users/${userId}`);
}

// Delete user mutation
export function useDeleteUserMutation() {
  return useApiDeleteMutation('/users');
}