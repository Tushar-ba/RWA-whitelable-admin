import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    isConnecting: false,
    error: null,
  });

  // Check if wallet is already connected
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setWalletState(prev => ({
          ...prev,
          isConnected: true,
          address: accounts[0],
        }));
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

  const connectWallet = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in first before connecting your wallet.',
        variant: 'destructive',
      });
      return;
    }

    if (typeof window === 'undefined' || !window.ethereum) {
      toast({
        title: 'Wallet Not Found',
        description: 'Please install MetaMask or another Web3 wallet.',
        variant: 'destructive',
      });
      return;
    }

    setWalletState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        const address = accounts[0];
        
        // Update wallet address in user profile
        try {
          await updateWalletAddress(address);
          
          setWalletState({
            isConnected: true,
            address,
            isConnecting: false,
            error: null,
          });

          toast({
            title: 'Wallet Connected',
            description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
          });
        } catch (error) {
          setWalletState(prev => ({
            ...prev,
            isConnecting: false,
            error: 'Failed to update profile with wallet address',
          }));
        }
      }
    } catch (error: any) {
      setWalletState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Failed to connect wallet',
      }));

      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect wallet',
        variant: 'destructive',
      });
    }
  };

  const disconnectWallet = async () => {
    setWalletState({
      isConnected: false,
      address: null,
      isConnecting: false,
      error: null,
    });

    // Update wallet address in user profile (remove it)
    try {
      await updateWalletAddress('');
      
      toast({
        title: 'Wallet Disconnected',
        description: 'Your wallet has been disconnected.',
      });
    } catch (error) {
      console.error('Error updating profile after disconnect:', error);
    }
  };

  const updateWalletAddress = async (address: string) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    try {
      await apiRequest.put(`/api/profile/${user.id}`, { walletAddress: address });
    } catch (error: any) {
      console.error('Error updating wallet address:', error);
      throw new Error(error.response?.data?.message || 'Failed to update wallet address');
    }
  };

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
  };
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, handler: (data: any) => void) => void;
      removeListener?: (event: string, handler: (data: any) => void) => void;
      isMetaMask?: boolean;
    } | undefined;
  }
}