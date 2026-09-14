/**
 * Office Hours configuration — entirely absent from the backend API spec (PDF).
 * Endpoints in use: GET /office-hours/current, POST /office-hours, PUT /office-hours/{id}
 */
export interface OfficeHours {
  id?: number; // Record ID (absent until first created)
  openingTime: string; // HH:mm format
  closingTime: string;
  absentTime: string;
  latenessGracePeriod: string;
  companyLatitude?: number;
  companyLongitude?: number;
  companyName?: string;
}

/** Request body for POST /office-hours and PUT /office-hours/{id} (coordinates sent as strings) */
export interface OfficeHoursRequest {
  id: number; // 0 when creating a new record
  openingTime: string;
  closingTime: string;
  absentTime: string;
  latenessGracePeriod: string;
  companyLatitude: string;
  companyLongitude: string;
}

