import { ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';

interface WalletGuardProps {
  children: ReactNode;
  requireConnection?: boolean;
  fallbackMessage?: string;
  showCard?: boolean;
}

export const WalletGuard = ({ 
  children, 
  requireConnection = true, 
  fallbackMessage = "Please connect your wallet to access this feature",
  showCard = true 
}: WalletGuardProps) => {
  const { isConnected, address } = useAccount();
  const { open } = useAppKit();

  if (!requireConnection || isConnected) {
    return <>{children}</>;
  }

  if (!showCard) {
    return (
      <div className="flex items-center justify-center p-4">
        <Button 
          onClick={() => open()}
          className="flex items-center gap-2"
          data-testid="connect-wallet-button"
        >
          <Wallet size={16} />
          Connect Wallet
        </Button>
      </div>
    );
  }

  return (
    <Card className="max-w-md mx-auto mt-8" data-testid="wallet-guard-card">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
            <Wallet size={32} className="text-orange-600 dark:text-orange-400" />
          </div>
        </div>
        <CardTitle>Wallet Connection Required</CardTitle>
        <CardDescription>
          {fallbackMessage}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button 
          onClick={() => open()}
          className="w-full flex items-center justify-center gap-2"
          data-testid="connect-wallet-button"
        >
          <Wallet size={16} />
          Connect Wallet
        </Button>
        <p className="text-sm text-muted-foreground mt-3">
          Connect your wallet to perform blockchain operations and manage admin roles.
        </p>
      </CardContent>
    </Card>
  );
};