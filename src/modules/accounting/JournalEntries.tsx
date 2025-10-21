import { useState } from "react";
import { logger } from "@/utils/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { useAccounting } from "@/context/AccountingContext";
import { JournalEntry } from "@/types/accounting";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function JournalEntries() {
  const { accounts, journalEntries, addJournalEntry } = useAccounting();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<Array<{ id: string; accountId: string; debit: number; credit: number; description: string }>>([
    { id: crypto.randomUUID(), accountId: "", debit: 0, credit: 0, description: "" }
  ]);

  const handleAddLine = () => {
    setLines([...lines, { id: crypto.randomUUID(), accountId: "", debit: 0, credit: 0, description: "" }]);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter(line => line.id !== id));
    }
  };

  const handleLineChange = (id: string, field: string, value: string | number) => {
    setLines(lines.map(line => 
      line.id === id ? { ...line, [field]: value } : line
    ));
  };

  const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    if (lines.some(line => !line.accountId)) {
      toast.error("Please select an account for all lines");
      return;
    }

    if (!isBalanced) {
      toast.error("Debits must equal credits");
      return;
    }

    if (totalDebit === 0 && totalCredit === 0) {
      toast.error("Entry must have at least one debit or credit");
      return;
    }

    try {
      const entry: JournalEntry = {
        id: crypto.randomUUID(),
        entryDate: format(entryDate, "yyyy-MM-dd"),
        entryNumber: "",
        description: description.trim(),
        isPosted: true,
        lines: lines.map(line => {
          const account = accounts.find(a => a.id === line.accountId);
          return {
            id: crypto.randomUUID(),
            journalEntryId: "",
            accountId: line.accountId,
            accountCode: account?.accountCode || "",
            accountName: account?.accountName || "",
            debit: Number(line.debit) || 0,
            credit: Number(line.credit) || 0,
            description: line.description
          };
        })
      };

      await addJournalEntry(entry);
      setIsDialogOpen(false);
      setDescription("");
      setLines([{ id: crypto.randomUUID(), accountId: "", debit: 0, credit: 0, description: "" }]);
      setEntryDate(new Date());
    } catch (error) {
      logger.error("Error creating journal entry:", error);
    }
  };

  const sortedEntries = [...journalEntries].sort((a, b) => 
    new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Journal Entries</CardTitle>
              <CardDescription>Record manual journal entries</CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedEntries.map((entry) => (
              <Card key={entry.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Entry #{entry.entryNumber}</CardTitle>
                      <CardDescription>{format(new Date(entry.entryDate), "MMM dd, yyyy")} - {entry.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entry.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>{line.accountCode} - {line.accountName}</TableCell>
                          <TableCell>{line.description || "-"}</TableCell>
                          <TableCell className="text-right">{line.debit > 0 ? line.debit.toFixed(2) : "-"}</TableCell>
                          <TableCell className="text-right">{line.credit > 0 ? line.credit.toFixed(2) : "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2} className="font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold">
                          {entry.lines.reduce((sum, line) => sum + line.debit, 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {entry.lines.reduce((sum, line) => sum + line.credit, 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </CardContent>
              </Card>
            ))}

            {sortedEntries.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No journal entries found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
            <DialogDescription>Create a manual journal entry</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Entry Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !entryDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {entryDate ? format(entryDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={entryDate} onSelect={(date) => date && setEntryDate(date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter entry description"
              />
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">Entry Lines</Label>
                <Button size="sm" onClick={handleAddLine}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line
                </Button>
              </div>

              <div className="space-y-3">
                {lines.map((line, index) => (
                  <div key={line.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      {index === 0 && <Label className="text-xs mb-1">Account</Label>}
                      <Select
                        value={line.accountId}
                        onValueChange={(value) => handleLineChange(line.id, "accountId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
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

                    <div className="col-span-3">
                      {index === 0 && <Label className="text-xs mb-1">Description</Label>}
                      <Input
                        value={line.description}
                        onChange={(e) => handleLineChange(line.id, "description", e.target.value)}
                        placeholder="Line description"
                      />
                    </div>

                    <div className="col-span-2">
                      {index === 0 && <Label className="text-xs mb-1">Debit</Label>}
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.debit || ""}
                        onChange={(e) => handleLineChange(line.id, "debit", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="col-span-2">
                      {index === 0 && <Label className="text-xs mb-1">Credit</Label>}
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.credit || ""}
                        onChange={(e) => handleLineChange(line.id, "credit", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="col-span-1">
                      {index === 0 && <div className="h-5" />}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLine(line.id)}
                        disabled={lines.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-12 gap-2 font-semibold">
                  <div className="col-span-7 text-right">Totals:</div>
                  <div className="col-span-2 text-right">{totalDebit.toFixed(2)}</div>
                  <div className="col-span-2 text-right">{totalCredit.toFixed(2)}</div>
                  <div className="col-span-1" />
                </div>
                <div className="text-right mt-2">
                  {isBalanced ? (
                    <span className="text-green-600 text-sm">✓ Balanced</span>
                  ) : (
                    <span className="text-red-600 text-sm">✗ Not balanced (difference: {Math.abs(totalDebit - totalCredit).toFixed(2)})</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isBalanced}>
              Post Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
