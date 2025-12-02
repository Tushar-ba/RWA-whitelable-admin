// Wallet configuration for Reown AppKit
export const projectId = process.env.VITE_WALLET_CONNECT_PROJECT_ID || '2f1b9d7e5a3c8b0f4d6e8a9c7b5d3f1e';

export const metadata = {
  name: process.env.SENDGRID_NAME,
  description: 'Admin panel for precious metals trading platform',
  url: window.location.origin,
  icons: [`${window.location.origin}/favicon.ico`]
};

// Supported chains configuration
export const chains = [
  {
    id: 1,
    name: 'Ethereum',
    network: 'ethereum',
    nativeCurrency: {
      decimals: 18,
      name: 'Ethereum',
      symbol: 'ETH',
    },
    rpcUrls: {
      default: {
        http: ['https://cloudflare-eth.com'],
      },
      public: {
        http: ['https://cloudflare-eth.com'],
      },
    },
    blockExplorers: {
      default: { name: 'Etherscan', url: 'https://etherscan.io' },
    },
  },
  {
    id: 137,
    name: 'Polygon',
    network: 'polygon',
    nativeCurrency: {
      decimals: 18,
      name: 'Polygon',
      symbol: 'MATIC',
    },
    rpcUrls: {
      default: {
        http: ['https://polygon-rpc.com'],
      },
      public: {
        http: ['https://polygon-rpc.com'],
      },
    },
    blockExplorers: {
      default: { name: 'PolygonScan', url: 'https://polygonscan.com' },
    },
  },
];