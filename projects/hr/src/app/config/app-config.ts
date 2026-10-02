/**
 * Application Configuration
 * Centralized configuration for feature flags and tunable parameters
 */

export interface AppConfig {
  // Attendance & Shift Configuration
  attendance: {
    overtimeThresholdMinutes: number; // Minutes of overtime required to trigger OT flag (default: 30)
  };
}

/**
 * Default application configuration
 * Override these values for different environments (dev, staging, prod)
 */
export const DEFAULT_APP_CONFIG: AppConfig = {
  attendance: {
    overtimeThresholdMinutes: 30 // Standard overtime threshold
  }
};

/**
 * Get the current application configuration
 * Can be extended to load from environment variables or API
 */
export function getAppConfig(): AppConfig {
  // Check for environment-based overrides
  const otThreshold = (window as any).__APP_CONFIG__?.attendance?.overtimeThresholdMinutes;

  return {
    attendance: {
      overtimeThresholdMinutes: otThreshold !== undefined ? otThreshold : DEFAULT_APP_CONFIG.attendance.overtimeThresholdMinutes
    }
  };
}
