/**
 * Application Configuration
 * Centralized configuration for feature flags and tunable parameters
 */

export interface AppConfig {
  // Feature flags
  features: {
    useMockShiftData: boolean; // Load mock shifts in development/testing
  };

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
  features: {
    useMockShiftData: true // Enable mock data by default for development
  },

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
  const useMockData = (window as any).__APP_CONFIG__?.features?.useMockShiftData;
  const otThreshold = (window as any).__APP_CONFIG__?.attendance?.overtimeThresholdMinutes;

  return {
    features: {
      useMockShiftData: useMockData !== undefined ? useMockData : DEFAULT_APP_CONFIG.features.useMockShiftData
    },
    attendance: {
      overtimeThresholdMinutes: otThreshold !== undefined ? otThreshold : DEFAULT_APP_CONFIG.attendance.overtimeThresholdMinutes
    }
  };
}
