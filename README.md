# Solulab Assets Admin

## Overview
Solulab Assets Admin is a fullstack web application for managing a precious metals trading platform. It enables administrators to oversee token operations for gold and silver, manage user accounts, process purchase and redemption requests, and maintain platform security through role-based access control. This application serves as the administrative backbone for a tokenized precious metals marketplace where users can buy and redeem physical gold and silver backed by actual inventory.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS with a custom brand color scheme (browns and golds) using CSS variables, utilizing shadcn/ui for components built on Radix UI primitives.
- **State Management**: TanStack Query for server state.
- **Routing**: Wouter.
- **Form Handling**: React Hook Form with Zod validation.
- **Build Tool**: Vite.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Email/password with OTP-based two-factor authentication.
- **Session Management**: Express sessions with PostgreSQL session store.
- **API Design**: RESTful endpoints.

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon.
- **ORM**: Drizzle ORM with migrations.
- **Schema Design**: Modular table structure supporting admin management, user accounts, inventory tracking, transaction processing, and notification systems.
- **Session Storage**: PostgreSQL-based session management.

### Authentication and Authorization
- **Multi-Factor Authentication**: Email/password login followed by email-delivered OTP verification.
- **Role-Based Access Control**: Dynamic permission system allowing granular module access control.
- **Session Security**: Server-side session management with secure cookie handling.
- **Password Recovery**: Forgot password flow with email-based reset functionality.
- **Account Security**: Login attempt tracking and account lockout capabilities.

### Module Organization
The application is organized into distinct functional modules:
- **Dashboard**: Centralized metrics and system overview.
- **User Management**: KYC status tracking and account administration.
- **Stock Management**: Physical precious metals inventory tracking.
- **Request Processing**: Purchase and redemption request workflows.
- **Wallet Integration**: Fireblocks wallet management for blockchain operations.
- **Role & Permission Management**: Administrative access control.
- **Notifications**: System-wide communication management.
- **Master Management**: System configuration and fee structures.

### Real-Time Notification System
- **Server-Side**: Socket.IO integrated with Express.js and MongoDB change streams for real-time monitoring of notification collection. Includes role-based filtering and targeted delivery.
- **Client-Side**: Singleton Socket service and `useRealtimeNotifications` hook for state management, unread count tracking, and connection status monitoring.

## External Dependencies

### Database Services
- **Neon Database**: PostgreSQL hosting service.
- **Drizzle ORM**: Type-safe database toolkit.

### UI and Styling Libraries
- **Radix UI**: Unstyled, accessible UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Class Variance Authority**: Utility for managing component variants.

### Development and Build Tools
- **Vite**: Modern build tool.
- **TypeScript**: Static type checking.
- **ESBuild**: Fast JavaScript bundler.
- **PostCSS**: CSS processing.

### Form and Validation
- **React Hook Form**: Performant form library.
- **Zod**: TypeScript-first schema validation library.
- **Hookform Resolvers**: Integration between React Hook Form and Zod.

### State Management and Data Fetching
- **TanStack Query**: Server state management.
- **React Context**: Client-side state management for authentication and user data.

### Blockchain Integration
- **Fireblocks Integration**: Prepared for institutional-grade wallet management.
- **Wagmi**: Hooks for interacting with Ethereum.
- **Ethers.js**: For Ethereum blockchain interactions.
- **Reown AppKit**: Multi-chain wallet connection with Ethereum and Solana support via `SolanaAdapter`.
- **Solana Web3.js**: Direct Solana blockchain integration through Solana adapter.
- **Dynamic Contract Addresses**: Solana program addresses configured via environment variables (`VITE_SOLANA_GOLD_PROGRAM_ID`, `VITE_SOLANA_SILVER_PROGRAM_ID`, `VITE_SOLANA_GATEKEEPER_PROGRAM_ID`) for flexible deployment across different environments.

### Notification Services
- **Email Services**: Configured for OTP delivery and system notifications.
- **Socket.IO**: Real-time bidirectional communication.

### Other APIs
- **GoldAPI Service**: For real-time gold and silver pricing.