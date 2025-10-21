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
import { CalendarIcon, FileSpreadsheet, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthContext";
import { exportToCSV, formatDataForCSV } from "@/utils/exportToCSV";
import type { Attendance } from "@/types/attendance";
import { getApiBaseUrl } from "@/utils/platformConfig";

const API_BASE_URL = getApiBaseUrl();

export const AttendanceList = () => {
  const { users, user: currentUser } = useAuth();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editAttendance, setEditAttendance] = useState<Attendance | null>(null);
  const [editRemarks, setEditRemarks] = useState("");

  useEffect(() => {
    loadAttendances();
  }, [userFilter, dateRange]);

  const loadAttendances = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (userFilter !== "all") {
        params.append("userId", userFilter);
      }
      if (dateRange.from) {
        params.append("startDate", format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange.to) {
        params.append("endDate", format(dateRange.to, 'yyyy-MM-dd'));
      }

      const response = await fetch(
        `${API_BASE_URL}/attendance?${params.toString()}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data: Attendance[] = await response.json();
        setAttendances(data);
      }
    } catch (error) {
      logger.error('Error loading attendances:', error);
      toast.error("Failed to load attendance records");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/attendance/${deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success("Attendance record deleted");
        loadAttendances();
      } else {
        toast.error("Failed to delete record");
      }
    } catch (error) {
      logger.error('Error deleting attendance:', error);
      toast.error("Failed to delete record");
    } finally {
      setDeleteId(null);
    }
  };

  const handleEdit = (attendance: Attendance) => {
    setEditAttendance(attendance);
    setEditRemarks(attendance.remarks || "");
  };

  const handleSaveEdit = async () => {
    if (!editAttendance) return;

    try {
      const response = await fetch(`${API_BASE_URL}/attendance/${editAttendance.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ remarks: editRemarks }),
      });

      if (response.ok) {
        toast.success("Attendance record updated");
        loadAttendances();
        setEditAttendance(null);
      } else {
        toast.error("Failed to update record");
      }
    } catch (error) {
      logger.error('Error updating attendance:', error);
      toast.error("Failed to update record");
    }
  };

  const handleExportCSV = () => {
    if (attendances.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csvData = formatDataForCSV(attendances.map(a => ({
      date: a.date,
      userName: a.userName,
      clockIn: format(new Date(a.clockIn), 'yyyy-MM-dd HH:mm:ss'),
      clockOut: a.clockOut ? format(new Date(a.clockOut), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
      totalHours: a.totalHours.toFixed(2),
      remarks: a.remarks || '',
    })), {
      date: 'Date',
      userName: 'Employee',
      clockIn: 'Clock In',
      clockOut: 'Clock Out',
      totalHours: 'Total Hours',
      remarks: 'Remarks',
    });

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    exportToCSV(csvData, `attendance-${timestamp}`);
    toast.success("Exported to CSV");
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {user.email}
                    </SelectItem>
                  ))}
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
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>View and manage all attendance records</CardDescription>
            </div>
            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading attendance records...</div>
          ) : attendances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No attendance records found</div>
          ) : (
            <div className="rounded-md border max-h-[600px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Remarks</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendances.map((attendance) => (
                    <TableRow key={attendance.id}>
                      <TableCell>{format(new Date(attendance.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{attendance.userName}</TableCell>
                      <TableCell>{format(new Date(attendance.clockIn), 'HH:mm')}</TableCell>
                      <TableCell>
                        {attendance.clockOut ? format(new Date(attendance.clockOut), 'HH:mm') : (
                          <span className="text-green-600 font-semibold">Active</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {attendance.totalHours.toFixed(2)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {attendance.remarks || '-'}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(attendance)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(attendance.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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
            <AlertDialogTitle>Delete Attendance Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attendance record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editAttendance} onOpenChange={() => setEditAttendance(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
            <DialogDescription>Update the remarks for this attendance record</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-remarks">Remarks</Label>
              <Input
                id="edit-remarks"
                placeholder="Enter remarks"
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAttendance(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
