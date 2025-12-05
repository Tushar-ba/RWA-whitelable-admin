import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { SolanaAdapter } from "@reown/appkit-adapter-solana";
import { polygon, holesky, solanaDevnet } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { defineChain } from "viem";

// 1. Get projectId from environment
const projectId = "7b39e78fb1848ff518252fe1d2153800";

// 2. Define Hoodi Testnet as a custom chain using viem
// Chain ID can be configured via env var, defaulting to a common testnet ID
const hoodiChainId = Number(import.meta.env.VITE_HOODI_CHAIN_ID || "560048"); // Default to Holesky-like ID, update if different
const hoodiRpcUrl = import.meta.env.VITE_ETHEREUM_RPC_URL || "https://0xrpc.io/hoodi";

const hoodiChain = defineChain({
  id: hoodiChainId,
  name: "Hoodi Testnet",
  network: "hoodi-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [hoodiRpcUrl],
    },
    public: {
      http: [hoodiRpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "Hoodi Explorer",
      url: import.meta.env.VITE_HOODI_EXPLORER_URL || "https://explorer.hoodi.io",
    },
  },
  testnet: true,
});

// Convert to AppKitNetwork format
const hoodiTestnet: AppKitNetwork = hoodiChain as AppKitNetwork;

// 3. Set up networks - Hoodi testnet first (as primary), then others
const networks = [hoodiTestnet, polygon, holesky, solanaDevnet] as [
  AppKitNetwork,
  ...AppKitNetwork[],
];

// 4. Setup Wagmi adapter for Ethereum networks
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

// 5. Setup Solana adapter
const solanaWeb3JsAdapter = new SolanaAdapter();

// 6. Configure the metadata
const metadata = {
  name: "Vaulted Assets Admin",
  description: "Admin panel for precious metals trading platform",
  url: typeof window !== "undefined" ? window.location.origin : "https://vaulted-assets.replit.app",
  icons: [
    typeof window !== "undefined"
      ? `${window.location.origin}/favicon.ico`
      : "https://vaulted-assets.replit.app/favicon.ico",
  ],
};

// 7. Create the AppKit instance with both Ethereum and Solana support
export const appKit = createAppKit({
  adapters: [wagmiAdapter, solanaWeb3JsAdapter],
  networks,
  metadata,
  projectId,
  features: {
    analytics: true,
  },
  themeMode: "light",
  themeVariables: {
    "--w3m-accent": "#B8860B", // Brand gold color
    "--w3m-color-mix": "#B8860B",
    "--w3m-border-radius-master": "8px",
  },
});

export { wagmiAdapter };
