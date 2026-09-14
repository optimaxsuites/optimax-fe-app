/**
 * Remote attendance metadata for GPS-based check-ins
 * Captures location, device, and network information
 */

export interface RemoteAttendanceMetadata {
  gpsCoordinates?: {
    lat: number;
    lng: number;
  };
  geoAddress?: string; // Human-readable address
  accuracy: number; // GPS accuracy in meters (matches backend RemoteAttendanceEventDTO.accuracy)

  // Fraud/VPN detection data (required by backend for remote check-in validation)
  userAgent?: string;
  ipAddress?: string;
  networkType?: string; // e.g. 'wifi', 'cellular', 'vpn'
  vpnDetected?: boolean;

  timestamp: Date;
}

