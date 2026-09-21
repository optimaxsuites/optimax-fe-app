import { LocalTimeDTO, PagedResponse } from './attendance-event.dto';

export type { PagedResponse };

/** UI-facing model used by the office-hours form (times as HH:mm strings). */
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

/**
 * Raw API shape for GET/POST/PUT /officeHours — times are LocalTime objects, coordinates are strings.
 * Identical shape for request and response bodies.
 */
export interface OfficeHoursApiDTO {
  id: number;
  openingTime: LocalTimeDTO;
  closingTime: LocalTimeDTO;
  absentTime: LocalTimeDTO;
  latenessGracePeriod: LocalTimeDTO;
  companyLatitude: string;
  companyLongitude: string;
  companyName: string;
}
