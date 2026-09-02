import { WorkingWindow } from '../../domain/attendance/working-window.dto';
import { ShiftTrackingMetrics } from '../../domain/attendance/shift-tracking-metrics.dto';
import { getAppConfig } from '../../../config/app-config';

export interface ClockPair {
  clockInIso: string | null | undefined;
  clockOutIso: string | null | undefined;
}

export interface ShiftTrackingConfig {
  otThresholdMinutes?: number; // default 30
}

function parseHHmm(time: string): { h: number; m: number } {
  const [h, m] = time.split(':').map(Number);
  return { h, m };
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function combineDateAndTime(dateIso: string, hhmm: string): Date {
  const [year, month, day] = dateIso.split('-').map(Number);
  const { h, m } = parseHHmm(hhmm);
  return new Date(year, month - 1, day, h, m, 0, 0);
}

function durationHours(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return 0;
  return ms / 3600000;
}

function toMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function resolveWindowEnd(start: Date, endTime: string): Date {
  // If endTime is <= startTime in clock terms, assume shift crosses midnight.
  const endCandidate = new Date(start);
  const { h, m } = parseHHmm(endTime);
  endCandidate.setHours(h, m, 0, 0);

  if (endCandidate.getTime() <= start.getTime()) {
    // crosses midnight
    return addDays(endCandidate, 1);
  }

  return endCandidate;
}

export function computeShiftTrackingMetrics(
  window: WorkingWindow,
  dateIso: string,
  clocks: ClockPair,
  config?: ShiftTrackingConfig
): ShiftTrackingMetrics {
  // Use provided config threshold, or fall back to app configuration
  const appConfig = getAppConfig();
  const otThresholdMinutes = config?.otThresholdMinutes ?? appConfig.attendance.overtimeThresholdMinutes;

  const clockIn = clocks.clockInIso ? new Date(clocks.clockInIso) : null;
  const clockOut = clocks.clockOutIso ? new Date(clocks.clockOutIso) : null;

  // Treat absent as no clock-in recorded.
  const isAbsent = !clockIn;

  // Build scheduled start/end datetimes for this day.
  const scheduledStart = combineDateAndTime(dateIso, window.openingTime);
  const scheduledEnd = resolveWindowEnd(scheduledStart, window.closingTime);

  const scheduledMinutes = Math.max(0, (scheduledEnd.getTime() - scheduledStart.getTime()) / 60000);
  const scheduledHours = scheduledMinutes / 60;

  if (isAbsent) {
    return {
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      overtimeMinutes: 0,
      undertimeMinutes: scheduledMinutes,
      workedHours: 0,
      scheduledHours,

      isAbsent: true,
      isLate: false,
      isEarlyDeparture: false,
      isOvertime: false,
      isUndertime: true
    };
  }

  // Lateness grace: window.latenessGracePeriod is already a threshold time.
  // Our spec: late when clock_in_time - shift_start_time > grace period.
  // Equivalent: clockIn > shift_start + grace.
  const graceThreshold = combineDateAndTime(dateIso, window.latenessGracePeriod);
  const effectiveLateMinutes = Math.max(0, (clockIn!.getTime() - graceThreshold.getTime()) / 60000);

  // Early departure: shift_end_time - clock_out_time > 0
  let earlyDepartureMinutes = 0;
  if (clockOut) {
    const diffMin = (scheduledEnd.getTime() - clockOut.getTime()) / 60000;
    earlyDepartureMinutes = diffMin > 0 ? diffMin : 0;
  }

  // Overtime: clock_out_time - shift_end_time > OT threshold
  let overtimeMinutes = 0;
  if (clockOut) {
    const diffMin = (clockOut.getTime() - scheduledEnd.getTime()) / 60000;
    overtimeMinutes = diffMin > otThresholdMinutes ? diffMin : 0;
  }

  // Undertime: scheduledDurationHours - actualWorkedHours > 0
  // actualWorkedHours uses clockIn->clockOut if clockOut exists, else 0.
  const worked = clockOut ? durationHours(clockIn!, clockOut) : 0;
  const undertimeHours = scheduledHours - worked;
  const undertimeMinutes = undertimeHours > 0 ? undertimeHours * 60 : 0;

  const isLate = effectiveLateMinutes > 0;
  const isEarlyDeparture = earlyDepartureMinutes > 0;
  const isOvertime = overtimeMinutes > 0;
  const isUndertime = undertimeMinutes > 0;

  return {
    lateMinutes: effectiveLateMinutes,
    earlyDepartureMinutes,
    overtimeMinutes,
    undertimeMinutes,
    workedHours: worked,
    scheduledHours,

    isAbsent: false,
    isLate,
    isEarlyDeparture,
    isOvertime,
    isUndertime
  };
}

