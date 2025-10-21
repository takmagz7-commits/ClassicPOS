export interface Attendance {
  id: string;
  userId: string;
  userName: string;
  clockIn: string;
  clockOut?: string;
  totalHours: number;
  date: string;
  remarks?: string;
}

export interface AttendanceSummary {
  totalDays: number;
  totalHours: number;
  averageHoursPerDay: number;
  attendances: Attendance[];
}
