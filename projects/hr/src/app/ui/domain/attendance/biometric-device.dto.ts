/**
 * ⚠️ NEW FILE (2026-07-14) - Biometric device and enrollment DTOs
 * Manages physical biometric devices and employee enrollments
 */

export type BiometricDeviceStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type BiometricEnrollmentType = 'FINGERPRINT' | 'FACIAL' | 'IRIS';
export type BiometricEnrollmentStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED';

export interface BiometricDeviceDTO {
  // System-generated fields
  id?: number; // Unique device identifier
  registeredAt?: string; // ISO timestamp - Registration timestamp
  registeredBy?: number; // Admin who registered device

  // Device identification
  deviceId: string; // Device serial number/unique identifier
  name?: string; // Friendly device name (e.g., "Main Gate - Device 1")

  // Device location & model
  branchCode: string; // Branch where device is located
  model?: string; // Device model name

  // Authentication
  apiKeyHash: string; // Hashed API key for device authentication

  // Synchronization
  lastSyncAt?: string; // ISO timestamp - Last sync with server

  // Status
  status?: BiometricDeviceStatus; // Device operational status
}

export interface BiometricDeviceRegistration {
  // Request to register new device
  deviceId: string; // Device serial number
  name: string; // Device name
  branchCode: string; // Branch location
  model?: string; // Device model
  // Backend will generate and hash the API key
}

export interface BiometricDeviceSyncResponse {
  // Response from device sync request
  deviceId: string; // Device ID
  lastSyncAt: string; // ISO timestamp - When sync completed
  enrollmentsCount: number; // Number of enrollments on device
  status: 'SYNC_COMPLETE' | 'SYNC_FAILED'; // Sync status
  errorMessage?: string; // Error message if sync failed
}

export interface BiometricDeviceStats {
  // Statistics about biometric devices
  totalDevices: number; // Total devices registered
  activeDevices: number; // Active devices
  inactiveDevices: number; // Inactive devices
  maintenanceDevices: number; // Under maintenance
  lastSyncTime: string; // ISO timestamp - Most recent sync
  devicesByBranch: Record<string, number>; // Branch code -> device count
}

export interface BiometricEnrollmentDTO {
  // System-generated fields
  id?: number; // Unique enrollment identifier
  enrolledAt: string; // ISO timestamp - Enrollment timestamp
  enrolledBy?: number; // Admin who performed enrollment

  // Employee & device reference
  employeeId: number; // Enrolled employee
  deviceId: string; // Device where enrolled

  // Biometric data
  templateData: string; // Encrypted biometric template
  templateHash: string; // Hash of template for verification

  // Enrollment details
  enrollmentType: BiometricEnrollmentType; // Biometric type
  quality: number; // Quality score (0-100)

  // Verification & expiration
  lastVerifiedAt?: string; // ISO timestamp - Last verification timestamp
  expiresAt?: string; // ISO timestamp - Enrollment expiration date

  // Status
  status: BiometricEnrollmentStatus; // Current enrollment status
}

export interface BiometricEnrollmentRequest {
  // Request to enroll new biometric
  employeeId: number; // Employee to enroll
  deviceId: string; // Device to use
  templateData: string; // Biometric template data
  enrollmentType: BiometricEnrollmentType; // Type of biometric
  // Backend calculates: quality, templateHash, enrolledAt
}

export interface BiometricEnrollmentVerification {
  // Response from enrollment verification
  enrollmentId: number; // Enrollment ID verified
  quality: number; // Re-calculated quality score
  isVerified: boolean; // Quality meets threshold?
  verifiedAt: string; // ISO timestamp - Verification time
  message: string; // "Quality OK" or "Quality too low"
}

export interface BiometricEnrollmentStats {
  // Statistics about enrollments
  totalEnrollments: number; // Total enrollments
  byType: {
    fingerprint: number; // Fingerprint enrollments
    facial: number; // Facial enrollments
    iris: number; // Iris enrollments
  };
  active: number; // Active enrollments
  expired: number; // Expired enrollments
  byBranch: Record<string, number>; // Branch code -> enrollment count
  averageQuality: number; // Average quality score
}

export interface EmployeeBiometricProfile {
  // All biometric info for an employee
  employeeId: number; // Employee ID
  enrollments: BiometricEnrollmentDTO[]; // All enrollments
  totalEnrollments: number; // Count of enrollments
  activeEnrollments: number; // Count of active enrollments
  expiredEnrollments: number; // Count of expired enrollments
  lastEnrollmentDate?: string; // ISO date - Most recent enrollment
}
