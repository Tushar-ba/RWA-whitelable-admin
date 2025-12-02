import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { LoginForm, OTPForm } from '@shared/schema';

// Login mutation hook
export function useLoginMutation() {
  return useMutation({
    mutationFn: async (credentials: LoginForm) => {
      const response = await apiRequest.post('/api/auth/login', credentials);
      return response;
    },
    onSuccess: (data) => {
      // Store login state (token is stored in HTTP-only cookie by server)
      localStorage.setItem('isAuthenticated', 'false'); // Not fully authenticated yet
      localStorage.setItem('requires2FA', 'true');
      localStorage.setItem('adminData', JSON.stringify(data.admin));
    },
    onError: (error) => {
      console.error('Login failed:', error);
      // Clear any stored auth data
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('requires2FA');
      localStorage.removeItem('adminData');
    }
  });
}

// OTP verification mutation hook
export function useOTPMutation() {
  return useMutation({
    mutationFn: async (otpData: OTPForm) => {
      const response = await apiRequest.post('/api/auth/verify-otp', otpData);
      return response;
    },
    onSuccess: () => {
      // Complete authentication
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.removeItem('requires2FA');
    },
    onError: (error) => {
      console.error('OTP verification failed:', error);
    }
  });
}

// Logout mutation hook
export function useLogoutMutation() {
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest.post('/api/auth/logout');
      return response;
    },
    onSuccess: () => {
      // Clear all auth data (cookie will be cleared by server)
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('requires2FA');
      localStorage.removeItem('adminData');
    },
    onError: (error) => {
      // Even if logout fails on server, clear local data
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('requires2FA');
      localStorage.removeItem('adminData');
      console.error('Logout error:', error);
    }
  });
}

// Check auth status hook
export function useCheckAuthQuery() {
  return useQuery({
    queryKey: ['auth-status'],
    queryFn: async () => {
      try {
        // Try to fetch user profile to check if authenticated
        const response = await apiRequest.get('/api/auth/me');
        return {
          isAuthenticated: true,
          requires2FA: false,
          adminData: response.admin
        };
      } catch (error) {
        // If API request fails, clear localStorage and require fresh login
        console.log('❌ Authentication failed, clearing localStorage');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('requires2FA');
        localStorage.removeItem('adminData');

        return {
          isAuthenticated: false,
          requires2FA: false,
          adminData: null
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false
  });
}

// Forgot password mutation hook
export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: async (email: { email: string }) => {
      const response = await apiRequest.post('/api/auth/forgot-password', email);
      return response;
    }
  });
}

// Resend OTP mutation hook
export function useResendOTPMutation() {
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest.post('/api/auth/resend-otp');
      return response;
    },
    onError: (error) => {
      console.error('Resend OTP failed:', error);
    }
  });
}

// Reset password mutation hook
export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: async (resetData: { password: string; token?: string }) => {
      const response = await apiRequest.post('/api/auth/reset-password', resetData);
      return response;
    },
    onSuccess: () => {
      // Clear auth data on password reset
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('requires2FA');
      localStorage.removeItem('adminData');
    }
  });
}

// Main auth hook that provides current user state
export function useAuth() {
  const { data: authData, isLoading } = useCheckAuthQuery();
  
  return {
    user: authData?.adminData || null,
    isAuthenticated: authData?.isAuthenticated || false,
    requires2FA: authData?.requires2FA || false,
    isLoading
  };
}