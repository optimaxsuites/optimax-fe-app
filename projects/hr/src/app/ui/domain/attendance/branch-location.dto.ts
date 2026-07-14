/**
 * ⚠️ NEW FILE (2026-07-14) - Branch and geofence DTOs
 * Manages company locations and geofence boundaries for attendance validation
 */

export interface BranchDTO {
  // System-generated fields
  id?: number; // Unique branch identifier
  createdAt?: string; // ISO timestamp - Creation timestamp
  updatedAt?: string; // ISO timestamp - Last update timestamp

  // Branch identification
  branchCode: string; // Unique branch code/identifier
  name: string; // Branch name

  // Address information
  address: string; // Physical address
  city: string; // City name
  state: string; // State/Province
  country: string; // Country

  // Location coordinates
  latitude: number; // GPS latitude of branch center
  longitude: number; // GPS longitude of branch center

  // Geofence configuration
  geofenceRadius: number; // Geofence radius in meters

  // Timezone
  timezone: string; // Timezone (e.g., "Asia/Kolkata")

  // Status
  isActive: boolean; // Whether branch is active
}

export interface GeofenceDTO {
  // System-generated fields
  id?: number; // Unique geofence ID

  // Branch reference
  branchId: number; // Associated branch

  // Geofence boundary definition (circular)
  centerLatitude: number; // Center point latitude
  centerLongitude: number; // Center point longitude
  radiusMeters: number; // Radius in meters

  // Geofence boundary definition (polygon - optional)
  polygonCoordinates?: Array<[number, number]>; // Polygon boundary coordinates [[lat, lng], ...]

  // Geofence configuration
  name: string; // Geofence name
  isActive: boolean; // Whether geofence is active
}

export interface LocationValidationResult {
  // Result of location validation
  isValid: boolean; // Whether location is valid
  isWithinGeofence: boolean; // Whether location is within geofence
  distanceFromCenter: number; // Distance from geofence center in meters
  nearestBranch?: BranchDTO; // Nearest branch if outside all geofences
  message: string; // Validation message
  riskLevel?: 'SAFE' | 'CAUTION' | 'ALERT'; // Risk level based on distance
}

export interface BranchLocationCreateRequest {
  // Request to create new branch
  branchCode: string; // Branch code
  name: string; // Branch name
  address: string; // Address
  city: string; // City
  state: string; // State
  country: string; // Country
  latitude: number; // Latitude
  longitude: number; // Longitude
  geofenceRadius: number; // Geofence radius
  timezone: string; // Timezone
}

export interface GeofenceCreateRequest {
  // Request to create new geofence
  branchId: number; // Branch ID
  centerLatitude: number; // Center latitude
  centerLongitude: number; // Center longitude
  radiusMeters: number; // Radius
  polygonCoordinates?: Array<[number, number]>; // Polygon (optional)
  name: string; // Name
}

export interface BranchStats {
  // Statistics about branches
  totalBranches: number; // Total branches registered
  activeBranches: number; // Active branches
  inactiveBranches: number; // Inactive branches
  employeesByBranch: Record<string, number>; // Branch code -> employee count
  totalGeofences: number; // Total geofences
  geofencesByBranch: Record<string, number>; // Branch ID -> geofence count
}

export interface LocationSummary {
  // Summary of all locations
  branches: BranchDTO[]; // All branches
  geofences: GeofenceDTO[]; // All geofences
  stats: BranchStats; // Location statistics
  lastUpdated: string; // ISO timestamp - Last update time
}
