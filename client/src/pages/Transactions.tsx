import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Receipt,
  ShoppingCart,
  Gift,
  ArrowUpCircle,
  ArrowRightLeft,
} from "lucide-react";
import BuyTransaction from "@/pages/BuyTransaction";
import GiftingTransaction from "@/pages/GiftingTransaction";
import RedemptionTransaction from "@/pages/RedemptionTransaction";
// import TransferTransaction from "@/pages/TransferTransaction";

export default function Transactions() {
  const [activeTab, setActiveTab] = useState("buy");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Receipt className="h-8 w-8 text-brand-gold" />
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-xl p-1">
          <TabsTrigger
            value="buy"
            className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-brown data-[state=active]:to-brand-dark-gold data-[state=active]:text-white rounded-lg font-semibold transition-all"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Buy Transaction</span>
          </TabsTrigger>
          <TabsTrigger
            value="gifting"
            className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-brown data-[state=active]:to-brand-dark-gold data-[state=active]:text-white rounded-lg font-semibold transition-all"
          >
            <Gift className="h-4 w-4" />
            <span>Gifting Transaction</span>
          </TabsTrigger>
          <TabsTrigger
            value="redemption"
            className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-brown data-[state=active]:to-brand-dark-gold data-[state=active]:text-white rounded-lg font-semibold transition-all"
          >
            <ArrowUpCircle className="h-4 w-4" />
            <span>Redemption Transaction</span>
          </TabsTrigger>
          {/* <TabsTrigger
            value="transfer"
            className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-brown data-[state=active]:to-brand-dark-gold data-[state=active]:text-white rounded-lg font-semibold transition-all"
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span>Transfer Transaction</span>
          </TabsTrigger> */}
        </TabsList>

        <TabsContent value="buy" className="space-y-0">
          <BuyTransaction />
        </TabsContent>

        <TabsContent value="gifting" className="space-y-0">
          <GiftingTransaction />
        </TabsContent>

        <TabsContent value="redemption" className="space-y-0">
          <RedemptionTransaction />
        </TabsContent>

        {/* <TabsContent value="transfer" className="space-y-0">
          <TransferTransaction />
        </TabsContent> */}
      </Tabs>
    </div>
  );
}
