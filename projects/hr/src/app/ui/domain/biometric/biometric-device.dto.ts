export type BiometricDeviceType = 'FINGERPRINT' | 'IRIS' | 'FACE' | 'PALM';

export interface BiometricDeviceDTO {
  id: number;
  deviceId: string;
  branchId: number;
  name: string;
  serialNumber: string;
  deviceType: BiometricDeviceType;
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  isOnline: boolean;
  lastHeartbeat: string;
  registeredDate: string;
  isActive: boolean;
  maxStorageCapacity: number;
  currentTemplateCount: number;
}

export interface BiometricEnrollmentDTO {
  id: number;
  employeeId: number;
  deviceId: string;
  templateData: string;
  enrollmentDate: string;
  enrolledBy: number;
  templateQuality: number;
  isFallback: boolean;
  enrollmentStatus: 'SUCCESS' | 'RETRY' | 'FAILED';
}

export interface DeviceSyncLogDTO {
  id: number;
  deviceId: string;
  syncTimestamp: string;
  recordCount: number;
  failedRecords: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  errorMessage?: string;
}

export interface FingerprintMatchResult {
  isMatch: boolean;
  confidence: number;
  enrollmentId: number;
}

export interface DeviceRegistrationRequest {
  deviceId: string;
  branchId: number;
  name: string;
  serialNumber: string;
  deviceType: BiometricDeviceType;
  manufacturer: string;
  model: string;
  macAddress: string;
  ipAddress: string;
}

export interface DeviceHeartbeat {
  isOnline: boolean;
  lastSeen: string;
  templateCount: number;
  storageUsed: number;
}
