import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from 'wagmi';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/providers/AuthProvider";
import { wagmiAdapter } from "@/config/reown";
import { useWalletValidation } from "@/hooks/useWalletValidation";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import AdminLayout from "@/components/layout/AdminLayout";
import Dashboard from "@/pages/Dashboard";
import RoleManagement from "@/pages/RoleManagement";
import AdminManagement from "@/pages/AdminManagement";
import StockManagement from "@/pages/StockManagement";
import PurchaseRequests from "@/pages/PurchaseRequests";
import PurchaseRequestDetails from "@/pages/PurchaseRequestDetails";
import RedemptionRequests from "@/pages/RedemptionRequests";
import RedemptionRequestDetails from "@/pages/RedemptionRequestDetails";
import UserManagement from "@/pages/UserManagement";
import UserDetails from "@/pages/UserDetails";
import WalletManagement from "@/pages/WalletManagement";
import GiftingManagement from "@/pages/GiftingManagement";
import Notifications from "@/pages/Notifications";
import MasterManagement from "@/pages/MasterManagement";
import Transactions from "@/pages/Transactions";
import Profile from "@/pages/Profile";

function WalletValidationProvider() {
  useWalletValidation();
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" nest>
        <AdminLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/role-management" component={RoleManagement} />
            <Route path="/admin-management" component={AdminManagement} />
            <Route path="/stock-management" component={StockManagement} />
            <Route path="/purchase-requests/:id" component={PurchaseRequestDetails} />
            <Route path="/purchase-requests" component={PurchaseRequests} />
            <Route path="/redemption-requests/:id" component={RedemptionRequestDetails} />
            <Route path="/redemption-requests" component={RedemptionRequests} />
            <Route path="/user-management" component={UserManagement} />
            <Route path="/user-details/:id" component={UserDetails} />
            <Route path="/wallet-management" component={WalletManagement} />
            <Route path="/gifting-management" component={GiftingManagement} />
            <Route path="/transactions" component={Transactions} />
            <Route path="/notifications" component={Notifications} />
            <Route path="/master-management" component={MasterManagement} />
            <Route path="/profile" component={Profile} />
            <Route component={NotFound} />
          </Switch>
        </AdminLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <WalletValidationProvider />
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;