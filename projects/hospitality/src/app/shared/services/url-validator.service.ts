import { Injectable } from '@angular/core';
import { AppConstants } from '../constants/app.constants';

@Injectable({
  providedIn: 'root'
})
export class UrlValidatorService {

  /**
   * Validates if a URL is safe to navigate to
   * @param url URL to validate
   * @returns true if URL is whitelisted and safe
   */
  isSafeUrl(url: string | null): boolean {
    if (!url) return false;

    // Check if URL starts with any whitelisted route
    return AppConstants.ALLOWED_RETURN_ROUTES.some(route =>
      url.startsWith(route)
    );
  }

  /**
   * Gets safe return URL or default fallback
   * @param returnUrl URL from query params
   * @param fallback Default URL if returnUrl is unsafe
   * @returns Safe URL to navigate to
   */
  getSafeReturnUrl(returnUrl: string | null, fallback: string[]): string | string[] {
    if (this.isSafeUrl(returnUrl)) {
      return returnUrl!;
    }
    return fallback;
  }
}
