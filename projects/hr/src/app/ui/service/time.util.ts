/**
 * Utility class for working with time-only strings (HH:mm or HH:mm:ss format)
 * Used for shift times, duration calculations, and time formatting
 */
export class TimeUtil {
  /**
   * Convert time string to total minutes
   * @param time Time string in "HH:mm" or "HH:mm:ss" format
   * @returns Total minutes since midnight
   * @example TimeUtil.toMinutes("09:30") // 570
   */
  static toMinutes(time: string): number {
    if (!time) return 0;
    const parts = time.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  }

  /**
   * Convert minutes to time string
   * @param minutes Total minutes since midnight
   * @returns Time string in "HH:mm" format
   * @example TimeUtil.fromMinutes(570) // "09:30"
   */
  static fromMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Format time to 12-hour format with AM/PM
   * @param time Time string in "HH:mm" or "HH:mm:ss" format
   * @returns Formatted time string
   * @example TimeUtil.format12Hour("14:30") // "2:30 PM"
   */
  static format12Hour(time: string): string {
    if (!time) return '';
    const parts = time.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    
    return `${hour12}:${minutes} ${period}`;
  }

  /**
   * Calculate duration between two times in minutes
   * @param startTime Start time string
   * @param endTime End time string
   * @returns Duration in minutes
   * @example TimeUtil.duration("09:00", "17:00") // 480
   */
  static duration(startTime: string, endTime: string): number {
    const start = this.toMinutes(startTime);
    const end = this.toMinutes(endTime);
    
    // Handle overnight shifts (end time is next day)
    if (end < start) {
      return (24 * 60) - start + end;
    }
    
    return end - start;
  }

  /**
   * Calculate duration in hours
   * @param startTime Start time string
   * @param endTime End time string
   * @returns Duration in hours (decimal)
   * @example TimeUtil.durationHours("09:00", "17:00") // 8
   */
  static durationHours(startTime: string, endTime: string): number {
    return this.duration(startTime, endTime) / 60;
  }

  /**
   * Format duration in minutes to readable string
   * @param minutes Duration in minutes
   * @returns Formatted duration
   * @example TimeUtil.formatDuration(150) // "2h 30m"
   */
  static formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  /**
   * Add minutes to a time string
   * @param time Base time string
   * @param minutes Minutes to add (can be negative)
   * @returns New time string
   * @example TimeUtil.addMinutes("09:00", 30) // "09:30"
   */
  static addMinutes(time: string, minutes: number): string {
    const totalMinutes = this.toMinutes(time) + minutes;
    const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    return this.fromMinutes(normalized);
  }

  /**
   * Check if time1 is before time2
   * @param time1 First time string
   * @param time2 Second time string
   * @returns True if time1 is before time2
   * @example TimeUtil.isBefore("09:00", "17:00") // true
   */
  static isBefore(time1: string, time2: string): boolean {
    return this.toMinutes(time1) < this.toMinutes(time2);
  }

  /**
   * Check if time1 is after time2
   * @param time1 First time string
   * @param time2 Second time string
   * @returns True if time1 is after time2
   * @example TimeUtil.isAfter("17:00", "09:00") // true
   */
  static isAfter(time1: string, time2: string): boolean {
    return this.toMinutes(time1) > this.toMinutes(time2);
  }

  /**
   * Validate time string format
   * @param time Time string to validate
   * @returns True if valid format
   * @example TimeUtil.isValid("09:30") // true
   */
  static isValid(time: string): boolean {
    if (!time) return false;
    const pattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?$/;
    return pattern.test(time);
  }

  /**
   * Get current time as string
   * @returns Current time in "HH:mm:ss" format
   * @example TimeUtil.now() // "14:30:25"
   */
  static now(): string {
    const date = new Date();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Convert 24-hour time to 12-hour format object
   * @param time Time string in "HH:mm" format
   * @returns Object with hour, minute, and period
   */
  static to12Hour(time: string): { hour: number; minute: number; period: 'AM' | 'PM' } {
    const parts = time.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    
    return {
      hour: hours % 12 || 12,
      minute: minutes,
      period: hours >= 12 ? 'PM' : 'AM'
    };
  }
}
