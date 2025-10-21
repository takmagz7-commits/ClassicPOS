import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  FileText, 
  TrendingUp, 
  Scale, 
  DollarSign,
  BarChart3,
  Receipt,
  Users
} from "lucide-react";

import ChartOfAccounts from "@/modules/accounting/ChartOfAccounts";
import JournalEntries from "@/modules/accounting/JournalEntries";
import Ledger from "@/modules/accounting/Ledger";
import TrialBalance from "@/modules/accounting/TrialBalance";
import IncomeStatement from "@/modules/accounting/IncomeStatement";
import BalanceSheet from "@/modules/accounting/BalanceSheet";
import CashFlow from "@/modules/accounting/CashFlow";
import AccountsReceivable from "@/modules/accounting/AccountsReceivable";
import AccountsPayable from "@/modules/accounting/AccountsPayable";
import { AccountingProvider } from "@/context/AccountingContext";
import { usePageTitle } from "@/hooks/use-page-title";

const Accounting = () => {
  usePageTitle();
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <AccountingProvider>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Accounting</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-9">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
            <TabsTrigger value="journal">Journal Entries</TabsTrigger>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
            <TabsTrigger value="trial">Trial Balance</TabsTrigger>
            <TabsTrigger value="income">P&L</TabsTrigger>
            <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
            <TabsTrigger value="ar">AR</TabsTrigger>
            <TabsTrigger value="ap">AP</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setActiveTab("accounts")}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">Chart of Accounts</CardTitle>
                  </div>
                  <CardDescription>
                    Manage your accounting accounts and categories
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setActiveTab("journal")}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    <CardTitle className="text-lg">Journal Entries</CardTitle>
                  </div>
                  <CardDescription>
                    Record manual journal entries and view posted transactions
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setActiveTab("ledger")}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-lg">General Ledger</CardTitle>
                  </div>
                  <CardDescription>
                    View transaction history for individual accounts
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setActiveTab("trial")}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-lg">Trial Balance</CardTitle>
                  </div>
                  <CardDescription>
                    Summary of all account balances to verify entries
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setActiveTab("income")}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-lg">Income Statement</CardTitle>
                  </div>
                  <CardDescription>
                    Profit and loss report for the selected period
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setActiveTab("balance")}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">Balance Sheet</CardTitle>
                  </div>
                  <CardDescription>
                    Financial position as of a specific date
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setActiveTab("cashflow")}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-cyan-600" />
                    <CardTitle className="text-lg">Cash Flow</CardTitle>
                  </div>
                  <CardDescription>
                    Cash movement from operating, investing, and financing activities
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setActiveTab("ar")}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-lg">Accounts Receivable</CardTitle>
                  </div>
                  <CardDescription>
                    Outstanding customer balances and aging report
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setActiveTab("ap")}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-red-600" />
                    <CardTitle className="text-lg">Accounts Payable</CardTitle>
                  </div>
                  <CardDescription>
                    Outstanding supplier balances and aging report
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="accounts">
            <ChartOfAccounts />
          </TabsContent>

          <TabsContent value="journal">
            <JournalEntries />
          </TabsContent>

          <TabsContent value="ledger">
            <Ledger />
          </TabsContent>

          <TabsContent value="trial">
            <TrialBalance />
          </TabsContent>

          <TabsContent value="income">
            <IncomeStatement />
          </TabsContent>

          <TabsContent value="balance">
            <BalanceSheet />
          </TabsContent>

          <TabsContent value="cashflow">
            <CashFlow />
          </TabsContent>

          <TabsContent value="ar">
            <AccountsReceivable />
          </TabsContent>

          <TabsContent value="ap">
            <AccountsPayable />
          </TabsContent>
        </Tabs>
      </div>
    </AccountingProvider>
  );
};

export default Accounting;
