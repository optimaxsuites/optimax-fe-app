export type CheckInSource = 'BIOMETRIC' | 'WEB' | 'MOBILE' | 'MANUAL';
export type NetworkType = 'WIFI' | 'MOBILE' | 'ETHERNET' | 'UNKNOWN';
export type FraudFlagType = 'SUSPICIOUS_LOCATION' | 'VPN_DETECTED' | 'RAPID_LOCATION_CHANGE' | 'NEW_DEVICE';
export type FraudReviewAction = 'APPROVED' | 'REJECTED' | 'ESCALATED';

export interface RemoteAttendanceMetadata {
  checkInSource: CheckInSource;
  deviceFingerprint: string;
  userAgent: string;
  ipAddress: string;
  gpsCoordinates?: {
    lat: number;
    lng: number;
  };
  geoAddress?: string;
  approximateAccuracy: number;
  networkType: NetworkType;
  vpnDetected: boolean;
  timestamp: string;
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
