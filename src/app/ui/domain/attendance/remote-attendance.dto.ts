/**
 * Remote attendance metadata for GPS-based check-ins
 * Captures location, device, and network information
 */

export interface RemoteAttendanceMetadata {
  // Location data
  gpsCoordinates?: {
    lat: number; // Latitude
    lng: number; // Longitude
  };
  geoAddress?: string; // Human-readable address
  approximateAccuracy: number; // GPS accuracy in meters

  // Timestamp
  timestamp: Date; // Timestamp of event
}
