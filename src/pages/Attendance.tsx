import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, List, BarChart3 } from "lucide-react";
import { TimeClock } from "@/modules/attendance/TimeClock";
import { AttendanceList } from "@/modules/attendance/AttendanceList";
import { AttendanceSummary } from "@/modules/attendance/AttendanceSummary";
import { useAuth } from "@/components/auth/AuthContext";
import { hasPermission } from "@/utils/permissions";

const Attendance = () => {
  const { user } = useAuth();
  
  if (!user) {
    return null;
  }

  const canClockIn = hasPermission(user.role, 'attendance', 'clockIn');
  const canView = hasPermission(user.role, 'attendance', 'view');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">
            Track employee attendance and working hours
          </p>
        </div>
      </div>

      <Tabs defaultValue={canClockIn ? "clock" : "list"} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {canClockIn && (
            <TabsTrigger value="clock" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Clock
            </TabsTrigger>
          )}
          {canView && (
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Attendance List
            </TabsTrigger>
          )}
          {canView && (
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Summary
            </TabsTrigger>
          )}
        </TabsList>

        {canClockIn && (
          <TabsContent value="clock" className="mt-6">
            <TimeClock />
          </TabsContent>
        )}

        {canView && (
          <TabsContent value="list" className="mt-6">
            <AttendanceList />
          </TabsContent>
        )}

        {canView && (
          <TabsContent value="summary" className="mt-6">
            <AttendanceSummary />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Attendance;
