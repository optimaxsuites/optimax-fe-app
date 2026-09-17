import { LocalTimeDTO, PagedResponse } from '../attendance/attendance-event.dto';

export type { PagedResponse };

/** UI-facing model (times as HH:mm strings, lowercase type). */
export interface WorkShiftDTO {
  id: string;
  name: string;
  type: 'morning' | 'evening' | 'night' | 'custom';
  startTime: string;   // "09:00"
  endTime: string;     // "17:00"
  description?: string;
  color?: string; // used in calendar UI for colorcoded shift
}

/** Raw API shape for GET/POST/PUT /shifts — identical for request and response. */
export interface ShiftApiDTO {
  id: number;
  name: string;
  type: string; // e.g. 'MORNING' — only example confirmed, so kept loose
  startTime: LocalTimeDTO;
  endTime: LocalTimeDTO;
  description: string;
  color: string;
}
