import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { AuthContextType, User } from "@/types";
import {
  useLoginMutation,
  useOTPMutation,
  useResendOTPMutation,
  useLogoutMutation,
  useCheckAuthQuery,
} from "@/hooks/useAuth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get auth mutations
  const loginMutation = useLoginMutation();
  const otpMutation = useOTPMutation();
  const resendOTPMutation = useResendOTPMutation();
  const logoutMutation = useLogoutMutation();

  // Check initial auth state using React Query
  const authQuery = useCheckAuthQuery();

  useEffect(() => {
    if (!authQuery.isLoading) {
      setIsAuthenticated(authQuery.data?.isAuthenticated || false);
      setUser(authQuery.data?.adminData || null);
      setIsLoading(false);
    }
  }, [authQuery.data, authQuery.isLoading]);

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      loginMutation.mutate(
        { email, password },
        {
          onSuccess: (data) => {
            setUser(data.admin);
            setIsAuthenticated(false); // Not fully authenticated until OTP verification
            resolve();
          },
          onError: (error) => {
            reject(error);
          },
        },
      );
    });
  };

  // OTP verification function
  const verifyOTP = async (otp: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      otpMutation.mutate(
        { otp },
        {
          onSuccess: async () => {
            // Refresh user data from server after OTP verification and wait for it to complete
            try {
              const refreshedData = await authQuery.refetch();
              if (refreshedData.data?.isAuthenticated) {
                setIsAuthenticated(true);
                setUser(refreshedData.data.adminData || null);
                resolve();
              } else {
                reject(new Error('Authentication verification failed'));
              }
            } catch (error) {
              console.error('Failed to refresh auth data:', error);
              reject(error);
            }
          },
          onError: (error) => {
            reject(error);
          },
        },
      );
    });
  };

  // Resend OTP function
  const resendOTP = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      resendOTPMutation.mutate(undefined, {
        onSuccess: () => {
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  // Logout function
  const logout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setUser(null);
        setIsAuthenticated(false);
        authQuery.refetch(); // Refresh auth state
      },
      onError: () => {
        // Clear local state even if server logout fails
        setUser(null);
        setIsAuthenticated(false);
      },
    });
  };

  const contextValue: AuthContextType = {
    user,
    login,
    verifyOTP,
    resendOTP,
    logout,
    isAuthenticated,
    isLoading: isLoading || loginMutation.isPending || otpMutation.isPending,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
