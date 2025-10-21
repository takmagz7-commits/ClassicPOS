import { useState, useEffect } from "react";
import { logger } from "@/utils/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarIcon, Download, RefreshCw, Search, Activity, Users, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthContext";
import { exportToCSV } from "@/utils/exportToCSV";
import type { ActivityLog } from "@/types/user";
import { getApiBaseUrl } from "@/utils/platformConfig";

const API_BASE_URL = getApiBaseUrl();

interface LogStats {
  totalLogs: number;
  logsByModule: { module: string; count: number }[];
  logsByUser: { user_name: string; count: number }[];
  recentLogs: ActivityLog[];
}

const AuditLogs = () => {
  const { users } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: undefined,
    to: undefined,
  });

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [userFilter, moduleFilter, actionFilter, dateRange]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchLogs();
        fetchStats();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, userFilter, moduleFilter, actionFilter, dateRange]);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      
      if (userFilter !== "all") params.append('userId', userFilter);
      if (moduleFilter !== "all") params.append('module', moduleFilter);
      if (actionFilter) params.append('action', actionFilter);
      if (dateRange.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      params.append('limit', '200');

      const response = await fetch(`${API_BASE_URL}/activity-logs?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      logger.error('Error fetching logs:', error);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));

      const response = await fetch(`${API_BASE_URL}/activity-logs/summary/stats?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      logger.error('Error fetching stats:', error);
    }
  };

  const handleExportCSV = () => {
    try {
      const exportData = filteredLogs.map(log => ({
        Timestamp: format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        User: log.userName,
        Module: log.module,
        Action: log.action,
        Details: log.details || '',
        'IP Address': log.ipAddress || '',
      }));

      exportToCSV(
        exportData,
        `audit_logs_${format(new Date(), 'yyyy-MM-dd_HHmmss')}`
      );
      toast.success('Logs exported successfully');
    } catch (error) {
      logger.error('Error exporting logs:', error);
      toast.error('Failed to export logs');
    }
  };

  const handleRefresh = () => {
    fetchLogs();
    fetchStats();
    toast.success('Logs refreshed');
  };

  const clearFilters = () => {
    setUserFilter("all");
    setModuleFilter("all");
    setActionFilter("");
    setDateRange({ from: undefined, to: undefined });
    setSearchTerm("");
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.userName.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.module.toLowerCase().includes(term) ||
      log.details?.toLowerCase().includes(term) ||
      log.ipAddress?.toLowerCase().includes(term)
    );
  });

  const modules = Array.from(new Set(logs.map(log => log.module))).sort();

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    if (action.toLowerCase().includes('delete') || action.toLowerCase().includes('remove')) {
      return "destructive";
    }
    if (action.toLowerCase().includes('create') || action.toLowerCase().includes('add')) {
      return "default";
    }
    if (action.toLowerCase().includes('update') || action.toLowerCase().includes('edit')) {
      return "secondary";
    }
    return "outline";
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            Track and monitor all system activities
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", autoRefresh && "animate-spin")} />
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Total Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalLogs.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {dateRange.from && dateRange.to
                  ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
                  : 'All time'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                Top Module
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.logsByModule[0]?.module || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.logsByModule[0]?.count || 0} activities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Most Active User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">
                {stats.logsByUser[0]?.user_name || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.logsByUser[0]?.count || 0} activities
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>View and filter all system activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.from && !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM d, yyyy")
                      )
                    ) : (
                      <span>Date range</span>
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

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Filter by action..."
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-[200px]"
                />
                {(userFilter !== "all" || moduleFilter !== "all" || actionFilter || dateRange.from || dateRange.to || searchTerm) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Showing {filteredLogs.length} of {logs.length} logs
                </span>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                        </TableCell>
                        <TableCell className="font-medium">{log.userName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.module}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {log.details || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.ipAddress || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchTerm || userFilter !== "all" || moduleFilter !== "all" || actionFilter || dateRange.from
                          ? "No logs match the current filters"
                          : "No activity logs found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {stats && stats.logsByModule.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Activities by Module</CardTitle>
              <CardDescription>Top modules by activity count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.logsByModule.slice(0, 10).map((item, index) => (
                  <div key={item.module} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <Badge variant="outline">{item.module}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${(item.count / stats.totalLogs) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activities by User</CardTitle>
              <CardDescription>Most active users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.logsByUser.slice(0, 10).map((item, index) => (
                  <div key={item.user_name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {item.user_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${(item.count / stats.totalLogs) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
