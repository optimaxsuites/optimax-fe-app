import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment.prod';
import {
  RemoteAttendanceMetadata,
  FraudDetectionFlags,
  FraudCheckResult,
  CheckInPatternAnalysis,
  NetworkType
} from '../../domain/attendance/remote-attendance.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable({ providedIn: 'root' })
export class RemoteAttendanceService {
  private readonly BASE = `${environment.apiBaseUrl}/x/api/v2/hr`;
  private fraudFlagsSubject = new BehaviorSubject<FraudDetectionFlags[]>([]);
  private deviceFingerprintCache: Map<string, string> = new Map();

  fraudFlags$ = this.fraudFlagsSubject.asObservable();

  constructor(private http: HttpClient) {}

  async captureDeviceFingerprint(): Promise<string> {
    const cached = this.getDeviceFingerprintFromCache();
    if (cached) {
      return cached;
    }

    const fingerprint = await this.generateDeviceFingerprint();
    this.cacheDeviceFingerprint(fingerprint);
    return fingerprint;
  }

  private async generateDeviceFingerprint(): Promise<string> {
    const components = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: (navigator as any).deviceMemory || 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      vendor: navigator.vendor,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: Date.now()
    };

    const componentString = JSON.stringify(components);
    const buffer = new TextEncoder().encode(componentString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private getDeviceFingerprintFromCache(): string | null {
    const cached = sessionStorage.getItem('device_fingerprint');
    return cached || null;
  }

  private cacheDeviceFingerprint(fingerprint: string): void {
    sessionStorage.setItem('device_fingerprint', fingerprint);
  }

  async checkLocationPermission(): Promise<boolean> {
    if (!('geolocation' in navigator)) {
      return false;
    }

    try {
      const permission = await (navigator as any).permissions?.query?.({ name: 'geolocation' });
      return permission?.state === 'granted';
    } catch {
      return false;
    }
  }

  async getCurrentLocation(): Promise<RemoteAttendanceMetadata> {
    const ipAddress = await this.getIpAddress();
    const networkInfo = await this.captureNetworkInfo();
    const vpnDetected = await this.detectVPN();
    const deviceFingerprint = await this.captureDeviceFingerprint();

    let gpsCoordinates = undefined;
    let geoAddress = undefined;
    let approximateAccuracy = 0;

    if (await this.checkLocationPermission()) {
      try {
        const position = await this.getGPSPosition();
        gpsCoordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        approximateAccuracy = position.coords.accuracy;
        geoAddress = await this.getAddressFromCoordinates(
          position.coords.latitude,
          position.coords.longitude
        );
      } catch (err) {
        console.warn('Could not get GPS location:', err);
      }
    }

    return {
      checkInSource: 'WEB',
      deviceFingerprint,
      userAgent: navigator.userAgent,
      ipAddress,
      vpnDetected,
      gpsCoordinates,
      geoAddress,
      approximateAccuracy,
      networkType: networkInfo.type,
      timestamp: new Date().toISOString()
    };
  }

  private getGPSPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  private async getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      return data.address?.city || data.address?.town || 'Unknown Location';
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  private async getIpAddress(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  async detectVPN(): Promise<boolean> {
    try {
      const response = await fetch('https://api.ipqualityscore.com/api/json/ip/reputation?ip=' + (await this.getIpAddress()));
      const data = await response.json();
      return data.is_crawler === true || data.is_vpn === true;
    } catch {
      return false;
    }
  }

  async captureNetworkInfo(): Promise<{ type: NetworkType; ipAddress: string }> {
    let networkType: NetworkType = 'UNKNOWN';

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const type = connection?.type || connection?.effectiveType;

      if (type?.includes('wifi')) networkType = 'WIFI';
      else if (type?.includes('cellular') || type?.includes('4g') || type?.includes('5g')) networkType = 'MOBILE';
      else if (type?.includes('ethernet')) networkType = 'ETHERNET';
    }

    const ipAddress = await this.getIpAddress();
    return { type: networkType, ipAddress };
  }

  validateRemoteCheckIn(metadata: RemoteAttendanceMetadata, employeeId: number, branchLatitude: number, branchLongitude: number): Observable<FraudCheckResult> {
    const body = { metadata, employeeId, branchLatitude, branchLongitude };
    return this.http.post<FraudCheckResult>(
      `${this.BASE}/fraud-detection/validate`,
      body
    ).pipe(
      tap(result => {
        if (result.flagged && result.flagged.length > 0) {
          this.fraudFlagsSubject.next([...this.fraudFlagsSubject.value, ...result.flagged]);
        }
      }),
      catchError(() => of({
        hasFraudIndicators: false,
        flagged: [],
        riskScore: 0,
        recommendations: []
      }))
    );
  }

  flagAttendanceRecord(
    recordId: number,
    employeeId: number,
    flagType: 'SUSPICIOUS_LOCATION' | 'VPN_DETECTED' | 'RAPID_LOCATION_CHANGE' | 'NEW_DEVICE',
    severity: 'LOW' | 'MEDIUM' | 'HIGH',
    description: string
  ): Observable<FraudDetectionFlags> {
    const flag: FraudDetectionFlags = {
      flagId: uuidv4(),
      recordId,
      employeeId,
      flagType,
      severity,
      description,
      detectedAt: new Date().toISOString(),
      autoFlagged: true
    };

    return this.http.post<FraudDetectionFlags>(
      `${this.BASE}/attendanceRecords/${recordId}/fraud-flag`,
      flag
    ).pipe(
      tap(savedFlag => {
        const current = this.fraudFlagsSubject.value;
        this.fraudFlagsSubject.next([...current, savedFlag]);
      }),
      catchError((err) => {
        console.error('Error flagging record:', err);
        throw err;
      })
    );
  }

  reviewFraudFlag(
    flagId: string,
    recordId: number,
    reviewedBy: number,
    action: 'APPROVED' | 'REJECTED' | 'ESCALATED',
    notes?: string
  ): Observable<FraudDetectionFlags> {
    const body = { reviewedBy, action, notes };
    return this.http.put<FraudDetectionFlags>(
      `${this.BASE}/attendanceRecords/${recordId}/fraud-flag/${flagId}/review`,
      body
    ).pipe(
      tap(reviewed => {
        const current = this.fraudFlagsSubject.value;
        const updated = current.map(f => f.flagId === flagId ? reviewed : f);
        this.fraudFlagsSubject.next(updated);
      }),
      catchError((err) => {
        console.error('Error reviewing fraud flag:', err);
        throw err;
      })
    );
  }

  getFraudFlagsByRecord(recordId: number): Observable<FraudDetectionFlags[]> {
    return this.http.get<any>(
      `${this.BASE}/attendanceRecords/${recordId}/fraud-flags`
    ).pipe(
      map(res => Array.isArray(res) ? res : (res?.flags ?? [])),
      catchError(() => of([]))
    );
  }

  getPendingFraudReviews(supervisorId?: number): Observable<FraudDetectionFlags[]> {
    let url = `${this.BASE}/fraud-detection/pending`;
    if (supervisorId) {
      url += `?supervisorId=${supervisorId}`;
    }
    return this.http.get<any>(url)
      .pipe(
        map(res => Array.isArray(res) ? res : (res?.flags ?? [])),
        catchError(() => of([]))
      );
  }

  getCheckInPatterns(employeeId: number, days: number = 30): Observable<CheckInPatternAnalysis> {
    return this.http.get<CheckInPatternAnalysis>(
      `${this.BASE}/fraud-detection/patterns/${employeeId}?days=${days}`
    ).pipe(
      catchError(() => of({
        employeeId,
        analysisStartDate: new Date().toISOString(),
        analysisEndDate: new Date().toISOString(),
        lastCheckInTime: new Date().toISOString(),
        frequentLocations: [],
        suspiciousPatterns: []
      }))
    );
  }

  getFraudDetectionDashboard(startDate?: string, endDate?: string): Observable<any> {
    let url = `${this.BASE}/fraud-detection/dashboard`;
    const params = [];

    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    return this.http.get<any>(url)
      .pipe(
        catchError(() => of({
          totalFlags: 0,
          pendingReview: 0,
          approved: 0,
          rejected: 0,
          flagsByType: {},
          topRiskEmployees: []
        }))
      );
  }

  whitelistEmployee(employeeId: number, reason?: string): Observable<void> {
    const body = { reason };
    return this.http.post<void>(
      `${this.BASE}/fraud-detection/whitelist/${employeeId}`,
      body
    ).pipe(
      catchError((err) => {
        console.error('Error whitelisting employee:', err);
        throw err;
      })
    );
  }

  blacklistEmployee(employeeId: number, reason: string): Observable<void> {
    const body = { reason };
    return this.http.post<void>(
      `${this.BASE}/fraud-detection/blacklist/${employeeId}`,
      body
    ).pipe(
      catchError((err) => {
        console.error('Error blacklisting employee:', err);
        throw err;
      })
    );
  }

  calculateLocationDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Convert to meters
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
