import { useState } from "react";
import { logger } from "@/utils/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useAccounting } from "@/context/AccountingContext";
import { ChartOfAccount, AccountType, AccountCategory } from "@/types/accounting";
import { toast } from "sonner";

const accountTypes: Array<{ value: AccountType; label: string }> = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" }
];

const accountCategories: Array<{ value: AccountCategory; label: string; type: AccountType }> = [
  { value: "current_asset", label: "Current Asset", type: "asset" },
  { value: "fixed_asset", label: "Fixed Asset", type: "asset" },
  { value: "current_liability", label: "Current Liability", type: "liability" },
  { value: "long_term_liability", label: "Long-term Liability", type: "liability" },
  { value: "equity", label: "Equity", type: "equity" },
  { value: "revenue", label: "Revenue", type: "income" },
  { value: "other_income", label: "Other Income", type: "income" },
  { value: "cost_of_goods_sold", label: "Cost of Goods Sold", type: "expense" },
  { value: "operating_expense", label: "Operating Expense", type: "expense" },
  { value: "other_expense", label: "Other Expense", type: "expense" }
];

export default function ChartOfAccounts() {
  const { accounts, addAccount, updateAccount, deleteAccount } = useAccounting();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const [formData, setFormData] = useState({
    accountCode: "",
    accountName: "",
    accountType: "asset" as AccountType,
    accountCategory: "current_asset" as AccountCategory,
    description: ""
  });

  const handleOpenDialog = (account?: ChartOfAccount) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        accountCategory: account.accountCategory,
        description: account.description || ""
      });
    } else {
      setEditingAccount(null);
      setFormData({
        accountCode: "",
        accountName: "",
        accountType: "asset",
        accountCategory: "current_asset",
        description: ""
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.accountCode || !formData.accountName) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, {
          accountCode: formData.accountCode,
          accountName: formData.accountName,
          accountType: formData.accountType,
          accountCategory: formData.accountCategory,
          description: formData.description,
          isActive: true
        });
      } else {
        await addAccount({
          id: crypto.randomUUID(),
          accountCode: formData.accountCode,
          accountName: formData.accountName,
          accountType: formData.accountType,
          accountCategory: formData.accountCategory,
          description: formData.description,
          isActive: true
        });
      }
      setIsDialogOpen(false);
    } catch (error) {
      logger.error("Error saving account:", error);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (confirm("Are you sure you want to delete this account?")) {
      try {
        await deleteAccount(accountId);
      } catch (error) {
        logger.error("Error deleting account:", error);
      }
    }
  };

  const filteredAccounts = filterType === "all" 
    ? accounts 
    : accounts.filter(acc => acc.accountType === filterType);

  const sortedAccounts = [...filteredAccounts].sort((a, b) => 
    a.accountCode.localeCompare(b.accountCode)
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Chart of Accounts</CardTitle>
              <CardDescription>Manage your accounting accounts</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="filter-type">Filter by Type</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger id="filter-type" className="w-[200px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {accountTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.accountCode}</TableCell>
                  <TableCell>{account.accountName}</TableCell>
                  <TableCell className="capitalize">{account.accountType}</TableCell>
                  <TableCell>{accountCategories.find(c => c.value === account.accountCategory)?.label}</TableCell>
                  <TableCell>{account.description || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(account)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(account.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sortedAccounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No accounts found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Edit Account" : "Add New Account"}</DialogTitle>
            <DialogDescription>
              {editingAccount ? "Update account information" : "Create a new account in the chart of accounts"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="accountCode">Account Code *</Label>
              <Input
                id="accountCode"
                value={formData.accountCode}
                onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
                placeholder="e.g., 1000"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="accountName">Account Name *</Label>
              <Input
                id="accountName"
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                placeholder="e.g., Cash"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="accountType">Account Type *</Label>
              <Select
                value={formData.accountType}
                onValueChange={(value: AccountType) => {
                  setFormData({ ...formData, accountType: value });
                  const firstCategory = accountCategories.find(c => c.type === value);
                  if (firstCategory) {
                    setFormData(prev => ({ ...prev, accountCategory: firstCategory.value }));
                  }
                }}
              >
                <SelectTrigger id="accountType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="accountCategory">Account Category *</Label>
              <Select
                value={formData.accountCategory}
                onValueChange={(value: AccountCategory) =>
                  setFormData({ ...formData, accountCategory: value })
                }
              >
                <SelectTrigger id="accountCategory">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountCategories
                    .filter(c => c.type === formData.accountType)
                    .map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingAccount ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
