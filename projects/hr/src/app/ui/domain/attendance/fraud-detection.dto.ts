/**
 * ⚠️ NEW FILE (2026-07-14) - Fraud detection and risk analysis DTOs
 * Tracks fraud patterns and risk flags for attendance security
 */

export type FraudPatternType = 'LOCATION_SPOOFING' | 'RAPID_LOCATION_CHANGE' | 'VPN_DETECTED' | 'DEVICE_CLONING';
export type RiskFlagType = 'FREQUENT_ABSENCE' | 'CHRONIC_LATENESS' | 'SUSPICIOUS_PATTERN' | 'FRAUD_DETECTED';
export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface FraudPatternDTO {
  // System-generated fields
  id?: number; // Pattern ID

  // Employee reference
  employeeId: number; // Employee with pattern

  // Pattern details
  patternType: FraudPatternType; // Type of fraud pattern
  confidence: number; // Confidence score (0-100)
  incidents: number; // Number of times detected
  lastDetectedAt: string; // ISO timestamp - Latest detection
  details: string; // Description of pattern
}

export interface RiskFlagDTO {
  // System-generated fields
  id?: number; // Flag ID

  // Employee reference
  employeeId: number; // Flagged employee

  // Risk details
  flagType: RiskFlagType; // Type of risk flag
  severity: RiskSeverity; // Risk severity
  description: string; // Flag details
  detectedAt: string; // ISO timestamp - Detection timestamp

  // Resolution
  isResolved: boolean; // Whether issue is resolved
  resolvedAt?: string; // ISO timestamp - Resolution timestamp
  resolutionNotes?: string; // Notes on resolution
}

export interface FraudDetectionDashboard {
  // Fraud detection overview
  period: string; // YYYY-MM - Report period
  totalAlerts: number; // Total fraud alerts

  // Breakdown by type
  byType: {
    locationSpoofing: number; // Location spoofing alerts
    rapidLocationChange: number; // Rapid location change alerts
    vpnDetected: number; // VPN detection alerts
    deviceCloning: number; // Device cloning alerts
  };

  // Severity breakdown
  highSeverity: number; // High severity alerts
  mediumSeverity: number; // Medium severity alerts
  lowSeverity: number; // Low severity alerts

  // Pattern & risk data
  patterns: FraudPatternDTO[]; // Detected fraud patterns
  topRisks: Array<{
    employeeId: number; // Employee ID
    employeeName: string; // Employee name
    riskLevel: RiskSeverity; // Risk level
    lastIncident: string; // ISO timestamp - Last incident
  }>; // Top at-risk employees

  generatedAt: string; // ISO timestamp - When generated
}

export interface FraudAlert {
  // Individual fraud alert
  id?: number; // Alert ID
  eventId: number; // Associated event
  recordId?: number; // Associated record
  employeeId: number; // Employee involved
  flagType: string; // Type of fraud detected
  severity: RiskSeverity; // Alert severity
  description: string; // Details
  flaggedAt: string; // ISO timestamp - When flagged
  resolvedAt?: string; // ISO timestamp - When resolved
  resolvedBy?: number; // Resolver user ID
  resolutionNotes?: string; // Resolution notes
}

export interface SuspiciousActivityReport {
  // Analysis of employee for suspicious activity
  employeeId: number; // Employee analyzed
  employeeName?: string; // Employee name
  analysisMonths: number; // Number of months analyzed
  patterns: FraudPatternDTO[]; // Found patterns
  riskScore: number; // Overall risk score (0-100)
  recommendation: string; // Action recommendation ("Monitor"|"Investigate"|"Flag for Review")
  lastIncidentDate: string; // ISO date - Last incident
  details: {
    frequentViolations: string[]; // Recurring violations
    riskFactors: string[]; // Risk factors identified
    historicalContext: string; // Background context
  };
}

export interface FraudThreshold {
  // Fraud detection thresholds
  locationChangeKmPerMinute: number; // Max km/minute for travel
  vpnDetectionEnabled: boolean; // Whether to flag VPN
  simultaneousEventWindow: number; // Window in seconds for duplicate detection
  suspiciousLocationRadius: number; // Radius in km from usual location
  riskScoreThreshold: number; // Score threshold for alerting
}

export interface FraudReviewRequest {
  // Request to review fraud alert
  alertId: number; // Alert ID to review
  reviewedBy: number; // Reviewer user ID
  isFraud: boolean; // Whether it's actual fraud
  notes: string; // Review notes
}

export interface FraudStatistics {
  // Statistics about fraud detection
  period: string; // YYYY-MM - Period
  totalAlertsGenerated: number; // Total alerts
  confirmedFraud: number; // Confirmed fraud cases
  falsePositives: number; // False alarms
  accuracy: number; // Detection accuracy % (0-100)
  employeesWithAlerts: number; // Employees with alerts
  topPatternType: FraudPatternType; // Most common fraud type
}
