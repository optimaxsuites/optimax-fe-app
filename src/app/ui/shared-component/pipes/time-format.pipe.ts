import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeFormat',
  standalone: true
})
export class TimeFormatPipe implements PipeTransform {

  transform(value: string | null | undefined, timezone: boolean = true): string {
    if (!value) return '-';

    try {
      // Handle ISO timestamp format (e.g., "2026-07-27T09:30:45.123Z")
      if (value.includes('T')) {
        const date = new Date(value);

        // Convert to local timezone if requested
        if (timezone) {
          // Use browser's local timezone (automatic conversion when creating Date object)
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${hours}:${minutes}`;
        } else {
          // Use UTC time if timezone=false
          const hours = String(date.getUTCHours()).padStart(2, '0');
          const minutes = String(date.getUTCMinutes()).padStart(2, '0');
          return `${hours}:${minutes}`;
        }
      }

      // Handle HH:mm format (already formatted)
      if (value.match(/^\d{2}:\d{2}/)) {
        return value.substring(0, 5);
      }

      return value;
    } catch {
      return value;
    }
  }
}
