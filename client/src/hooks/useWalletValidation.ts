import { useEffect, useRef, useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useCheckAuthQuery } from '@/hooks/useAuth';

/**
 * Hook that validates the connected wallet address matches the admin's stored wallet address
 * Automatically disconnects and shows error if addresses don't match
 */
export function useWalletValidation() {
  const { address, isConnected } = useAccount();
  const { isAuthenticated } = useAuth();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();
  const authQuery = useCheckAuthQuery();
  const [validatedAddresses, setValidatedAddresses] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Only proceed if all required conditions are met
    if (!isAuthenticated || !isConnected || !address || !authQuery.data?.adminData?.walletAddress) {
      return;
    }

    const connectedAddress = address.toLowerCase();
    const storedWalletAddress = authQuery.data.adminData.walletAddress.toLowerCase();

    // Skip if we've already validated this address
    if (validatedAddresses.has(connectedAddress)) {
      return;
    }

    // Add a delay to ensure the connection is stable before validating
    const validationTimeout = setTimeout(() => {
      if (connectedAddress !== storedWalletAddress) {
        console.log('❌ Wallet mismatch detected:', { connectedAddress, storedWalletAddress });
        
        // Disconnect the mismatched wallet
        disconnect();
        
        // Show error toast
        toast({
          title: 'Wallet Mismatch',
          description: `You have to connect this ${authQuery.data.adminData.walletAddress} wallet address.`,
          variant: 'destructive',
          duration: 10000,
        });

        // Mark this address as validated (failed)
        setValidatedAddresses(prev => new Set(prev).add(connectedAddress));
      } else {
        console.log('✅ Wallet address validated successfully');
        // Mark this address as validated (passed)
        setValidatedAddresses(prev => new Set(prev).add(connectedAddress));
      }
    }, 1000); // 1 second delay to ensure stable connection

    return () => clearTimeout(validationTimeout);
  }, [address, isConnected, isAuthenticated, authQuery.data?.adminData?.walletAddress, disconnect, toast, validatedAddresses]);

  // Clear validated addresses when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setValidatedAddresses(new Set());
    }
  }, [isAuthenticated]);
}