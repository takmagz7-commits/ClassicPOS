import { useState, useEffect } from "react";
import { logger } from "@/utils/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { useAccounting } from "@/context/AccountingContext";
import { LedgerEntry } from "@/types/accounting";
import { format } from "date-fns";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/lib/utils";

export default function Ledger() {
  const { accounts } = useAccounting();
  const { currentCurrency } = useCurrency();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedAccountId) {
      fetchLedger();
    }
  }, [selectedAccountId]);

  const fetchLedger = async () => {
    if (!selectedAccountId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/accounting/ledger?accountId=${selectedAccountId}`);
      if (response.ok) {
        const data = await response.json();
        setLedgerEntries(data);
      }
    } catch (error) {
      logger.error("Error fetching ledger:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const finalBalance = ledgerEntries.length > 0 
    ? ledgerEntries[ledgerEntries.length - 1].balance 
    : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>General Ledger</CardTitle>
          <CardDescription>View transaction history for individual accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label htmlFor="account-select">Select Account</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger id="account-select">
                <SelectValue placeholder="Choose an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.accountCode} - {account.accountName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAccount && (
            <>
              <div className="mb-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-lg">{selectedAccount.accountCode} - {selectedAccount.accountName}</h3>
                <p className="text-sm text-muted-foreground capitalize">{selectedAccount.accountType} - {selectedAccount.accountCategory.replace(/_/g, " ")}</p>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : ledgerEntries.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Entry #</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerEntries.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell>{format(new Date(entry.date), "MMM dd, yyyy")}</TableCell>
                          <TableCell>{entry.entryNumber}</TableCell>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell className="text-right">
                            {entry.debit > 0 ? formatCurrency(entry.debit, currentCurrency) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.credit > 0 ? formatCurrency(entry.credit, currentCurrency) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(entry.balance, currentCurrency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={5} className="font-bold text-right">Ending Balance</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(finalBalance, currentCurrency)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found for this account
                </div>
              )}
            </>
          )}

          {!selectedAccount && (
            <div className="text-center py-8 text-muted-foreground">
              Select an account to view its ledger
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
