/**
 * ⚠️ UPDATED (2026-07-14) - Added complete RemoteAttendanceEventDTO wrapper
 * Now includes both event wrapper and underlying metadata
 */

export type CheckInSource = 'BIOMETRIC' | 'WEB' | 'MOBILE' | 'MANUAL';
export type NetworkType = 'WIFI' | 'MOBILE' | 'ETHERNET' | 'UNKNOWN';
export type FraudFlagType = 'SUSPICIOUS_LOCATION' | 'VPN_DETECTED' | 'RAPID_LOCATION_CHANGE' | 'NEW_DEVICE' | 'DEVICE_CLONING';
export type FraudReviewAction = 'APPROVED' | 'REJECTED' | 'ESCALATED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type EventType = 'IN' | 'OUT';

export interface RemoteAttendanceMetadata {
  // Check-in source
  checkInSource: CheckInSource; // Source device type (BIOMETRIC|WEB|MOBILE|MANUAL)

  // Device information
  deviceFingerprint: string; // Unique device identifier
  userAgent: string; // Browser/app user agent string
  ipAddress: string; // Client IP address

  // Location data
  gpsCoordinates?: {
    lat: number; // Latitude
    lng: number; // Longitude
  };
  geoAddress?: string; // Human-readable address
  approximateAccuracy: number; // GPS accuracy in meters

  // Network information
  networkType: NetworkType; // Network type (WIFI|MOBILE|ETHERNET|UNKNOWN)
  vpnDetected: boolean; // Whether VPN was detected

  // Timestamp
  timestamp: string; // ISO timestamp of event
}

export interface RemoteAttendanceEventDTO {
  // System-generated fields
  id?: number; // Unique event identifier
  createdAt: string; // ISO timestamp - Event creation timestamp

  // Employee identification
  employeeId: number; // Employee checking in remotely

  // Event details
  eventDate: string; // ISO date - Date of remote check-in
  eventTime: string; // ISO timestamp - Time of check-in
  eventType: EventType; // Check-in or Check-out (IN|OUT)

  // Location information
  latitude: number; // GPS latitude of location
  longitude: number; // GPS longitude of location
  accuracy: number; // GPS accuracy in meters
  isWithinGeofence: boolean; // Whether location is within company geofence
  distanceFromOffice?: number; // Distance from office in km

  // Device information
  deviceFingerprint: string; // Device identifier
  ipAddress: string; // IP address of remote device

  // Evidence & notes
  photos?: string[]; // Photo URLs for verification
  notes?: string; // Employee notes about remote work

  // Approval workflow
  approvalStatus: ApprovalStatus; // Supervisor approval (PENDING|APPROVED|REJECTED)
  approvedBy?: number; // Approving supervisor ID
  approvedAt?: string; // ISO timestamp - Approval timestamp
  rejectionReason?: string; // Reason for rejection

  // Metadata reference
  metadata?: RemoteAttendanceMetadata; // Underlying metadata (optional reference)
}

export interface FraudDetectionFlags {
  flagId: string;
  recordId: number;
  employeeId: number;
  flagType: FraudFlagType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  detectedAt: string;
  reviewedBy?: number;
  reviewedAt?: string;
  reviewAction?: FraudReviewAction;
  reviewNotes?: string;
  autoFlagged: boolean;
}

export interface FraudCheckResult {
  hasFraudIndicators: boolean;
  flagged: FraudDetectionFlags[];
  riskScore: number;
  recommendations: string[];
}

export interface CheckInPatternAnalysis {
  employeeId: number;
  analysisStartDate: string;
  analysisEndDate: string;
  lastCheckInLocation?: { lat: number; lng: number };
  lastCheckInTime: string;
  frequentLocations: LocationFrequency[];
  suspiciousPatterns: SuspiciousPattern[];
}

export interface LocationFrequency {
  address: string;
  coordinates: { lat: number; lng: number };
  checkInCount: number;
  lastSeen: string;
}

export interface SuspiciousPattern {
  description: string;
  flagType: FraudFlagType;
  occurrences: number;
  lastOccurrence: string;
}
