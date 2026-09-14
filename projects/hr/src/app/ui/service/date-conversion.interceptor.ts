import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * HTTP Interceptor that automatically converts ISO date strings to Date objects.
 * The attendance contract uses checkIn/checkOut, so only those names are treated
 * as time-bearing fields for conversion.
 */
@Injectable()
export class DateConversionInterceptor implements HttpInterceptor {
  // ISO date pattern: YYYY-MM-DD or YYYY-MM-DD HH:mm:ss
  private readonly isoDatePattern = /^\d{4}-\d{2}-\d{2}(?:\s\d{2}:\d{2}:\d{2})?$/;

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      map((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse && event.body) {
          event = event.clone({ body: this.convertDates(event.body) });
        }
        return event;
      })
    );
  }

  /**
   * Recursively converts date strings to Date objects
   */
  private convertDates(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertDates(item));
    }

    // Handle objects
    if (typeof obj === 'object') {
      const converted: any = {};
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        
        // Convert if:
        // 1. Field name ends with 'At' or 'Time' (createdAt, eventTime, etc.)
        // 2. Value is a string matching ISO date pattern
        if (this.shouldConvertField(key, value)) {
          converted[key] = new Date(value);
        } else if (typeof value === 'object') {
          // Recursively convert nested objects
          converted[key] = this.convertDates(value);
        } else {
          converted[key] = value;
        }
      }
      return converted;
    }

    return obj;
  }

  /**
   * Check if a field should be converted to Date
   */
  private shouldConvertField(key: string, value: any): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    // Convert known date fields, including legacy field names only if needed.
    const isLegacyTimeField = key === 'clockInTime' || key === 'clockOutTime';
    const isDateField = key.endsWith('At') || key.endsWith('Time') || isLegacyTimeField;

    // Must match ISO date pattern
    const isISODate = this.isoDatePattern.test(value);

    return isDateField && isISODate;
  }
}
