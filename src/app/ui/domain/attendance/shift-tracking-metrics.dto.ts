export interface ShiftTrackingMetrics {
  lateMinutes: number;
  earlyDepartureMinutes: number;
  overtimeMinutes: number;
  undertimeMinutes: number;
  workedHours: number;
  scheduledHours: number;

  // convenience flags for UI/rules
  isAbsent: boolean;
  isLate: boolean;
  isEarlyDeparture: boolean;
  isOvertime: boolean;
  isUndertime: boolean;
}

