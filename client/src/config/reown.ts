import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { SolanaAdapter } from "@reown/appkit-adapter-solana";
import { mainnet, polygon, holesky, solanaDevnet } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";

// 1. Get projectId from environment
const projectId = "7b39e78fb1848ff518252fe1d2153800";

// 2. Set up networks including Solana
const networks = [mainnet, polygon, holesky, solanaDevnet] as [
  AppKitNetwork,
  ...AppKitNetwork[],
];

// 3. Setup Wagmi adapter for Ethereum networks
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

// 4. Setup Solana adapter
const solanaWeb3JsAdapter = new SolanaAdapter();

// 5. Configure the metadata
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

// 6. Create the AppKit instance with both Ethereum and Solana support
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
