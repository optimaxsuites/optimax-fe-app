import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment.prod';
import {
  RemoteAttendanceMetadata,
  FraudDetectionFlags,
  FraudCheckResult,
  CheckInPatternAnalysis
} from '../../domain/attendance/remote-attendance.dto';
import { v4 as uuidv4 } from 'uuid';

type NetworkType = 'WIFI' | 'MOBILE' | 'ETHERNET' | 'UNKNOWN';

const API_ENDPOINTS = {
  VALIDATE_FRAUD: () => `${environment.apiBaseUrl}/x/api/v2/hr/fraud-detection/validate`,
  FRAUD_FLAG: (recordId: number) => `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/${recordId}/fraud-flag`,
  FRAUD_FLAG_REVIEW: (recordId: number, flagId: string) =>
    `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/${recordId}/fraud-flag/${flagId}/review`,
  FRAUD_FLAGS_BY_RECORD: (recordId: number) => `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/${recordId}/fraud-flags`,
  PENDING_FRAUD_REVIEWS: () => `${environment.apiBaseUrl}/x/api/v2/hr/fraud-detection/pending`,
  FRAUD_PATTERNS: (employeeId: number) => `${environment.apiBaseUrl}/x/api/v2/hr/fraud-detection/patterns/${employeeId}`,
  FRAUD_DASHBOARD: () => `${environment.apiBaseUrl}/x/api/v2/hr/fraud-detection/dashboard`,
  WHITELIST_EMPLOYEE: (employeeId: number) => `${environment.apiBaseUrl}/x/api/v2/hr/fraud-detection/whitelist/${employeeId}`,
  BLACKLIST_EMPLOYEE: (employeeId: number) => `${environment.apiBaseUrl}/x/api/v2/hr/fraud-detection/blacklist/${employeeId}`
};

@Injectable({ providedIn: 'root' })
export class RemoteAttendanceService {
  private readonly BASE = `${environment.apiBaseUrl}/x/api/v2/hr`;
  private fraudFlagsSubject = new BehaviorSubject<FraudDetectionFlags[]>([]);
  private deviceFingerprintCache: Map<string, string> = new Map();

  fraudFlags$ = this.fraudFlagsSubject.asObservable();

  constructor(private http: HttpClient) {}

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
      } catch (err) {}
    }

    return {
      checkInSource: 'WEB',
      deviceFingerprint: '', // removed fingerprint capture
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
    return this.http.post<FraudCheckResult>(API_ENDPOINTS.VALIDATE_FRAUD(), body).pipe(
      tap(result => {
        if (result.flagged?.length > 0) {
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

    return this.http.post<FraudDetectionFlags>(API_ENDPOINTS.FRAUD_FLAG(recordId), flag).pipe(
      tap(savedFlag => {
        const current = this.fraudFlagsSubject.value;
        this.fraudFlagsSubject.next([...current, savedFlag]);
      }),
      catchError(err => { throw err; })
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
    return this.http.put<FraudDetectionFlags>(API_ENDPOINTS.FRAUD_FLAG_REVIEW(recordId, flagId), body).pipe(
      tap(reviewed => {
        const current = this.fraudFlagsSubject.value;
        const updated = current.map(f => f.flagId === flagId ? reviewed : f);
        this.fraudFlagsSubject.next(updated);
      }),
      catchError(err => { throw err; })
    );
  }

  getFraudFlagsByRecord(recordId: number): Observable<FraudDetectionFlags[]> {
    return this.http.get<any>(API_ENDPOINTS.FRAUD_FLAGS_BY_RECORD(recordId)).pipe(
      map(res => Array.isArray(res) ? res : (res?.flags ?? [])),
      catchError(() => of([]))
    );
  }

  getPendingFraudReviews(supervisorId?: number): Observable<FraudDetectionFlags[]> {
    const url = supervisorId
      ? `${API_ENDPOINTS.PENDING_FRAUD_REVIEWS()}?supervisorId=${supervisorId}`
      : API_ENDPOINTS.PENDING_FRAUD_REVIEWS();

    return this.http.get<any>(url).pipe(
      map(res => Array.isArray(res) ? res : (res?.flags ?? [])),
      catchError(() => of([]))
    );
  }

  getCheckInPatterns(employeeId: number, days: number = 30): Observable<CheckInPatternAnalysis> {
    const url = `${API_ENDPOINTS.FRAUD_PATTERNS(employeeId)}?days=${days}`;
    return this.http.get<CheckInPatternAnalysis>(url).pipe(
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
    let url = API_ENDPOINTS.FRAUD_DASHBOARD();
    const params = [];

    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    return this.http.get<any>(url).pipe(
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
    return this.http.post<void>(API_ENDPOINTS.WHITELIST_EMPLOYEE(employeeId), body).pipe(
      catchError(err => { throw err; })
    );
  }

  blacklistEmployee(employeeId: number, reason: string): Observable<void> {
    const body = { reason };
    return this.http.post<void>(API_ENDPOINTS.BLACKLIST_EMPLOYEE(employeeId), body).pipe(
      catchError(err => { throw err; })
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

