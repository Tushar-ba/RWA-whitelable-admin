import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';

interface ConnectWalletButtonProps {
  size?: 'sm' | 'lg' | 'default' | 'icon';
  variant?: 'default' | 'outline' | 'secondary';
  showIcon?: boolean;
  className?: string;
}

export const ConnectWalletButton = ({
  size = 'default',
  variant = 'default',
  showIcon = true,
  className = ''
}: ConnectWalletButtonProps) => {
  const { isConnected, address } = useAccount();
  const { open } = useAppKit();

  if (isConnected) {
    return (
      <Button
        onClick={() => open()}
        variant={variant}
        size={size}
        className={`flex items-center gap-2 ${className}`}
        data-testid="wallet-connected-button"
      >
        {showIcon && <Wallet size={16} />}
        <span className="hidden sm:inline">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <span className="sm:hidden">Connected</span>
      </Button>
    );
  }

  return (
    <Button
      onClick={() => open()}
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className}`}
      data-testid="connect-wallet-button"
    >
      {showIcon && <Wallet size={16} />}
      Connect Wallet
    </Button>
  );
};