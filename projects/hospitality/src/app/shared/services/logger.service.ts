import { Injectable } from '@angular/core';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private isDevelopment = !this.isProduction();

  private isProduction(): boolean {
    return typeof window !== 'undefined' && window.location.hostname !== 'localhost';
  }

  /**
   * Log debug messages (development only)
   */
  debug(message: string, data?: any): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, data);
    }
  }

  /**
   * Log info messages
   */
  info(message: string, data?: any): void {
    console.info(`[INFO] ${message}`, data);
  }

  /**
   * Log warning messages
   */
  warn(message: string, data?: any): void {
    console.warn(`[WARN] ${message}`, data);
  }

  /**
   * Log error messages
   */
  error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`, error);
  }

  /**
   * Log with context
   */
  log(level: LogLevel, message: string, context?: string, data?: any): void {
    const prefix = context ? `[${context}]` : '';
    const timestamp = new Date().toISOString();

    switch (level) {
      case 'debug':
        this.debug(`${prefix} ${message}`, data);
        break;
      case 'info':
        this.info(`${prefix} ${message}`, data);
        break;
      case 'warn':
        this.warn(`${prefix} ${message}`, data);
        break;
      case 'error':
        this.error(`${prefix} ${message}`, data);
        break;
    }
  }
}
