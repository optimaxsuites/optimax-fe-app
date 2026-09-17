import { EmployeeDetailDTO, PagedResponse } from '../attendance/attendance-event.dto';

export type { PagedResponse };

export type BiometricDeviceType = 'FINGERPRINT' | 'IRIS' | 'FACE' | 'PALM';

/** GET/POST/PUT /biometric-devices — identical shape for request and response. */
export interface BiometricDeviceDTO {
  id: number;
  deviceId: string;
  branchId: string;
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

/** POST /biometric-devices/{deviceId}/sync-events — one raw event captured by the device. */
export interface DeviceSyncEventDTO {
  employeeCode: string;
  eventType: string;
  eventTime: string;
  rawTemplateHash?: string;
  deviceIpAddress?: string;
}

export interface DeviceSyncEventsRequest {
  deviceId: string;
  events: DeviceSyncEventDTO[];
}

/**
 * UI/write-facing enrollment model (employeeId is the flat FK used by the enrollment form
 * and consistent with every other write endpoint in this API family).
 */
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

/** GET /biometric-enrollments responses — employeeId is the embedded employee snapshot. */
export interface BiometricEnrollmentApiDTO {
  id: number;
  employeeId: EmployeeDetailDTO;
  deviceId: string;
  templateData: string;
  enrollmentDate: string;
  enrolledBy: number;
  templateQuality: number;
  isFallback: boolean;
  enrollmentStatus: 'SUCCESS' | 'RETRY' | 'FAILED';
}
