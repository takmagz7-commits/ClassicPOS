import { useState, useEffect } from "react";
import { logger } from "@/utils/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, FileSpreadsheet, Pencil, Trash2, CheckCircle, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthContext";
import { exportToCSV, formatDataForCSV } from "@/utils/exportToCSV";
import type { Payroll, PayrollStatus } from "@/types/user";
import { getApiBaseUrl } from "@/utils/platformConfig";

const API_BASE_URL = getApiBaseUrl();

export const PayrollList = () => {
  const { users, user: currentUser } = useAuth();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userFilter, setUserFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editPayroll, setEditPayroll] = useState<Payroll | null>(null);
  const [editForm, setEditForm] = useState({
    baseSalary: 0,
    totalAllowances: 0,
    totalDeductions: 0,
    overtimeAmount: 0,
  });
  const [approveId, setApproveId] = useState<string | null>(null);
  const [payId, setPayId] = useState<string | null>(null);
  const [createJournalEntry, setCreateJournalEntry] = useState(true);

  useEffect(() => {
    loadPayrolls();
  }, [userFilter, statusFilter, dateRange]);

  const loadPayrolls = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (userFilter !== "all") {
        params.append("userId", userFilter);
      }
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (dateRange.from) {
        params.append("startDate", format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange.to) {
        params.append("endDate", format(dateRange.to, 'yyyy-MM-dd'));
      }

      const response = await fetch(
        `${API_BASE_URL}/payroll?${params.toString()}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data: Payroll[] = await response.json();
        setPayrolls(data);
      }
    } catch (error) {
      logger.error('Error loading payrolls:', error);
      toast.error("Failed to load payroll records");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/payroll/${deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success("Payroll record deleted");
        loadPayrolls();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete record");
      }
    } catch (error) {
      logger.error('Error deleting payroll:', error);
      toast.error("Failed to delete record");
    } finally {
      setDeleteId(null);
    }
  };

  const handleEdit = (payroll: Payroll) => {
    setEditPayroll(payroll);
    setEditForm({
      baseSalary: payroll.baseSalary,
      totalAllowances: payroll.totalAllowances,
      totalDeductions: payroll.totalDeductions,
      overtimeAmount: payroll.overtimeAmount,
    });
  };

  const handleSaveEdit = async () => {
    if (!editPayroll) return;

    try {
      const response = await fetch(`${API_BASE_URL}/payroll/${editPayroll.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        toast.success("Payroll record updated");
        loadPayrolls();
        setEditPayroll(null);
      } else {
        toast.error("Failed to update record");
      }
    } catch (error) {
      logger.error('Error updating payroll:', error);
      toast.error("Failed to update record");
    }
  };

  const handleApprove = async () => {
    if (!approveId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/payroll/${approveId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success("Payroll approved");
        loadPayrolls();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to approve payroll");
      }
    } catch (error) {
      logger.error('Error approving payroll:', error);
      toast.error("Failed to approve payroll");
    } finally {
      setApproveId(null);
    }
  };

  const handlePay = async () => {
    if (!payId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/payroll/${payId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ createJournalEntry }),
      });

      if (response.ok) {
        toast.success(createJournalEntry ? "Payroll paid and journal entry created" : "Payroll paid");
        loadPayrolls();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to pay payroll");
      }
    } catch (error) {
      logger.error('Error paying payroll:', error);
      toast.error("Failed to pay payroll");
    } finally {
      setPayId(null);
      setCreateJournalEntry(true);
    }
  };

  const handleExportCSV = () => {
    if (payrolls.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csvData = formatDataForCSV(payrolls.map(p => ({
      userName: p.userName,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      baseSalary: p.baseSalary.toFixed(2),
      totalAllowances: p.totalAllowances.toFixed(2),
      totalDeductions: p.totalDeductions.toFixed(2),
      overtimeAmount: p.overtimeAmount.toFixed(2),
      netSalary: p.netSalary.toFixed(2),
      status: p.status,
    })), {
      userName: 'Employee',
      periodStart: 'Period Start',
      periodEnd: 'Period End',
      baseSalary: 'Base Salary',
      totalAllowances: 'Allowances',
      totalDeductions: 'Deductions',
      overtimeAmount: 'Overtime',
      netSalary: 'Net Salary',
      status: 'Status',
    });

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    exportToCSV(csvData, `payroll-${timestamp}`);
    toast.success("Exported to CSV");
  };

  const getStatusBadge = (status: PayrollStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-blue-600">Approved</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-green-600">Paid</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter payroll records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.from && !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, yyyy")} -{" "}
                          {format(dateRange.to, "LLL dd, yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, yyyy")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      setDateRange({
                        from: range?.from,
                        to: range?.to
                      });
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payroll Records</CardTitle>
              <CardDescription>View and manage all payroll records</CardDescription>
            </div>
            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading payroll records...</div>
          ) : payrolls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No payroll records found</div>
          ) : (
            <div className="rounded-md border max-h-[600px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Base Salary</TableHead>
                    <TableHead className="text-right">Allowances</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Overtime</TableHead>
                    <TableHead className="text-right">Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((payroll) => (
                    <TableRow key={payroll.id}>
                      <TableCell className="font-medium">{payroll.userName}</TableCell>
                      <TableCell>
                        {format(new Date(payroll.periodStart), 'MMM dd')} - {format(new Date(payroll.periodEnd), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">${payroll.baseSalary.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${payroll.totalAllowances.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${payroll.totalDeductions.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${payroll.overtimeAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">${payroll.netSalary.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(payroll.status)}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex gap-2">
                            {payroll.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(payroll)}
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setApproveId(payroll.id)}
                                  title="Approve"
                                >
                                  <CheckCircle className="h-4 w-4 text-blue-600" />
                                </Button>
                              </>
                            )}
                            {(payroll.status === 'pending' || payroll.status === 'approved') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPayId(payroll.id)}
                                title="Pay"
                              >
                                <DollarSign className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {payroll.status !== 'paid' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(payroll.id)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payroll Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payroll record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!approveId} onOpenChange={() => setApproveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Payroll</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this payroll? Once approved, it can be paid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove}>Approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!payId} onOpenChange={() => setPayId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pay Payroll</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this payroll as paid? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="createJournalEntry"
                checked={createJournalEntry}
                onChange={(e) => setCreateJournalEntry(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="createJournalEntry" className="text-sm font-medium">
                Create journal entry in accounting
              </label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePay}>Pay</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editPayroll} onOpenChange={() => setEditPayroll(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Payroll Record</DialogTitle>
            <DialogDescription>Update the salary components for this payroll record</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-baseSalary">Base Salary</Label>
              <Input
                id="edit-baseSalary"
                type="number"
                step="0.01"
                value={editForm.baseSalary}
                onChange={(e) => setEditForm({ ...editForm, baseSalary: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-allowances">Total Allowances</Label>
              <Input
                id="edit-allowances"
                type="number"
                step="0.01"
                value={editForm.totalAllowances}
                onChange={(e) => setEditForm({ ...editForm, totalAllowances: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-deductions">Total Deductions</Label>
              <Input
                id="edit-deductions"
                type="number"
                step="0.01"
                value={editForm.totalDeductions}
                onChange={(e) => setEditForm({ ...editForm, totalDeductions: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-overtime">Overtime Amount</Label>
              <Input
                id="edit-overtime"
                type="number"
                step="0.01"
                value={editForm.overtimeAmount}
                onChange={(e) => setEditForm({ ...editForm, overtimeAmount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Net Salary:</span>
              <span className="text-xl font-bold">
                ${(editForm.baseSalary + editForm.totalAllowances + editForm.overtimeAmount - editForm.totalDeductions).toFixed(2)}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPayroll(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
