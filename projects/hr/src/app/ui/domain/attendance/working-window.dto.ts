// domain/attendance/working-window.model.ts

//export type ScheduleMode = 'office-hours' | 'shift' | 'mixed';

export interface WorkingWindow {
  scheduleType: 'office-hours' | 'shift';
  shiftName?: string;
  openingTime: string;       // "09:00"
  latenessGracePeriod: string;     // "09:15"
  absentTime: string;         // "10:00"
  closingTime: string;         // "17:00"
  sourceId: string;                // OfficeHours config ID or Shift ID
}