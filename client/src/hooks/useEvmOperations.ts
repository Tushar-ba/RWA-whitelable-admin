import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { toast } from '@/hooks/use-toast';

// Contract addresses - these should ideally come from environment variables
const GOLD_CONTRACT_ADDRESS = import.meta.env.VITE_GOLD_TOKEN_CONTRACT || '';
const SILVER_CONTRACT_ADDRESS = import.meta.env.VITE_SILVER_TOKEN_CONTRACT || '';

// Asset Protection ABI - minimal set for freeze/unfreeze/wipe operations
const ASSET_PROTECTION_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "isFrozen",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "freeze",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "unfreeze",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "wipeFrozenAddress",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export interface EvmOperationRequest {
  tokenType: 'gold' | 'silver';
  address: string;
}

// Helper function to get contract address
const getContractAddress = (tokenType: 'gold' | 'silver'): `0x${string}` | null => {
  const address = tokenType === 'gold' ? GOLD_CONTRACT_ADDRESS : SILVER_CONTRACT_ADDRESS;
  if (!address) {
    console.warn(`${tokenType.toUpperCase()} contract address not configured. Please set VITE_${tokenType.toUpperCase()}_CONTRACT_ADDRESS environment variable.`);
    return null;
  }
  return address as `0x${string}`;
};

// Helper function to check if EVM operations are available
const isEvmAvailable = (tokenType: 'gold' | 'silver'): boolean => {
  const address = tokenType === 'gold' ? GOLD_CONTRACT_ADDRESS : SILVER_CONTRACT_ADDRESS;
  return !!address;
};

// Helper function to validate Ethereum address format
const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Hook to read frozen status directly from contract
export const useEvmFrozenStatus = (tokenType: 'gold' | 'silver' | null, address: string | null) => {
  const contractAddress = tokenType ? getContractAddress(tokenType) : null;
  const evmAvailable = tokenType ? isEvmAvailable(tokenType) : false;
  const isValidAddress = address ? isValidEthereumAddress(address) : false;

  return useReadContract({
    address: contractAddress || undefined,
    abi: ASSET_PROTECTION_ABI,
    functionName: 'isFrozen',
    args: address && isValidAddress ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!tokenType && !!address && !!contractAddress && evmAvailable && isValidAddress,
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });
};

// Hook to freeze an address
export const useEvmFreeze = () => {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const freeze = async (request: EvmOperationRequest) => {
    // Validate inputs
    if (!request.address || !isValidEthereumAddress(request.address)) {
      throw new Error('Invalid Ethereum address format');
    }

    if (!isEvmAvailable(request.tokenType)) {
      throw new Error(`${request.tokenType.toUpperCase()} contract address not configured. Please set VITE_${request.tokenType.toUpperCase()}_CONTRACT_ADDRESS environment variable.`);
    }

    const contractAddress = getContractAddress(request.tokenType);
    if (!contractAddress) {
      throw new Error(`${request.tokenType.toUpperCase()} contract address not available`);
    }

    try {
      writeContract({
        address: contractAddress,
        abi: ASSET_PROTECTION_ABI,
        functionName: 'freeze',
        args: [request.address as `0x${string}`],
      });

      toast({
        title: "Opening MetaMask",
        description: `Please confirm the ${request.tokenType.toUpperCase()} freeze transaction in your wallet.`,
      });
    } catch (error) {
      console.error(`Error freezing ${request.tokenType} address:`, error);
      toast({
        title: "Freeze Transaction Failed", 
        description: `Failed to freeze ${request.tokenType.toUpperCase()} address: ${(error as Error).message}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    freeze,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
};

// Hook to unfreeze an address
export const useEvmUnfreeze = () => {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const unfreeze = async (request: EvmOperationRequest) => {
    // Validate inputs
    if (!request.address || !isValidEthereumAddress(request.address)) {
      throw new Error('Invalid Ethereum address format');
    }

    if (!isEvmAvailable(request.tokenType)) {
      throw new Error(`${request.tokenType.toUpperCase()} contract address not configured. Please set VITE_${request.tokenType.toUpperCase()}_CONTRACT_ADDRESS environment variable.`);
    }

    const contractAddress = getContractAddress(request.tokenType);
    if (!contractAddress) {
      throw new Error(`${request.tokenType.toUpperCase()} contract address not available`);
    }

    try {
      writeContract({
        address: contractAddress,
        abi: ASSET_PROTECTION_ABI,
        functionName: 'unfreeze',
        args: [request.address as `0x${string}`],
      });

      toast({
        title: "Opening MetaMask",
        description: `Please confirm the ${request.tokenType.toUpperCase()} unfreeze transaction in your wallet.`,
      });
    } catch (error) {
      console.error(`Error unfreezing ${request.tokenType} address:`, error);
      toast({
        title: "Unfreeze Transaction Failed",
        description: `Failed to unfreeze ${request.tokenType.toUpperCase()} address: ${(error as Error).message}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    unfreeze,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
};

// Hook to wipe frozen address tokens
export const useEvmWipe = () => {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const wipe = async (request: EvmOperationRequest) => {
    // Validate inputs
    if (!request.address || !isValidEthereumAddress(request.address)) {
      throw new Error('Invalid Ethereum address format');
    }

    if (!isEvmAvailable(request.tokenType)) {
      throw new Error(`${request.tokenType.toUpperCase()} contract address not configured. Please set VITE_${request.tokenType.toUpperCase()}_CONTRACT_ADDRESS environment variable.`);
    }

    const contractAddress = getContractAddress(request.tokenType);
    if (!contractAddress) {
      throw new Error(`${request.tokenType.toUpperCase()} contract address not available`);
    }

    try {
      writeContract({
        address: contractAddress,
        abi: ASSET_PROTECTION_ABI,
        functionName: 'wipeFrozenAddress',
        args: [request.address as `0x${string}`],
      });

      toast({
        title: "Opening MetaMask",
        description: `Please confirm the ${request.tokenType.toUpperCase()} wipe transaction in your wallet.`,
      });
    } catch (error) {
      console.error(`Error wiping ${request.tokenType} address:`, error);
      toast({
        title: "Wipe Transaction Failed",
        description: `Failed to wipe ${request.tokenType.toUpperCase()} tokens: ${(error as Error).message}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    wipe,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
};

// Additional utility hooks for transaction status
export const useTransactionStatus = (hash: `0x${string}` | undefined) => {
  const { isLoading: isConfirming, isSuccess, isError, error } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    isConfirming,
    isSuccess,
    isError,
    error,
  };
};