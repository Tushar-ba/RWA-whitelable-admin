import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TransactionHashProps {
  hash: string;
  className?: string;
}

export function TransactionHash({ hash, className = "" }: TransactionHashProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const truncatedHash = hash 
    ? `${hash.slice(0, 4)}...${hash.slice(-4)}`
    : 'N/A';

  const handleCopy = async () => {
    if (!hash) return;
    
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Transaction hash copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy transaction hash",
        variant: "destructive",
      });
    }
  };

  if (!hash) {
    return <span className={`text-gray-500 ${className}`}>N/A</span>;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span 
        className="font-mono text-sm text-gray-900 dark:text-gray-100"
        data-testid={`text-hash-${hash.slice(0, 8)}`}
      >
        {truncatedHash}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
        data-testid={`button-copy-hash-${hash.slice(0, 8)}`}
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3 text-gray-600 dark:text-gray-400" />
        )}
      </Button>
    </div>
  );
}