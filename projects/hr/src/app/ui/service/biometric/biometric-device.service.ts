import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, from } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment.prod';
import {
  BiometricDeviceDTO,
  BiometricEnrollmentDTO,
  DeviceSyncLogDTO,
  FingerprintMatchResult,
  DeviceRegistrationRequest,
  DeviceHeartbeat
} from '../../domain/biometric/biometric-device.dto';
import { AttendanceTableRecord } from '../../domain/attendance/attendancetable.dto';

@Injectable({ providedIn: 'root' })
export class BiometricDeviceService {
  private readonly BASE = `${environment.apiBaseUrl}/x/api/v2/hr`;
  private devicesSubject = new BehaviorSubject<BiometricDeviceDTO[]>([]);
  private enrollmentsSubject = new BehaviorSubject<BiometricEnrollmentDTO[]>([]);
  private offlineQueue: AttendanceTableRecord[] = [];

  devices$ = this.devicesSubject.asObservable();
  enrollments$ = this.enrollmentsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeOfflineStorage();
  }

  private initializeOfflineStorage(): void {
    if ('indexedDB' in window) {
      const request = indexedDB.open('BiometricAttendanceDB', 1);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('offlineRecords')) {
          db.createObjectStore('offlineRecords', { keyPath: 'id', autoIncrement: true });
        }
      };
    }
  }

  getDevices(): BiometricDeviceDTO[] {
    return this.devicesSubject.value;
  }

  getAllDevices(): Observable<BiometricDeviceDTO[]> {
    return this.http.get<any>(`${this.BASE}/biometric-devices`)
      .pipe(
        map(res => Array.isArray(res) ? res : (res?.content ?? [])),
        tap(devices => this.devicesSubject.next(devices)),
        catchError(() => of([]))
      );
  }

  getDevicesByBranch(branchId: number): Observable<BiometricDeviceDTO[]> {
    return this.http.get<any>(`${this.BASE}/biometric-devices/branch/${branchId}`)
      .pipe(
        map(res => Array.isArray(res) ? res : (res?.content ?? [])),
        catchError(() => of([]))
      );
  }

  registerDevice(request: DeviceRegistrationRequest): Observable<BiometricDeviceDTO> {
    return this.http.post<BiometricDeviceDTO>(`${this.BASE}/biometric-devices/register`, request)
      .pipe(
        tap(device => {
          const devices = this.devicesSubject.value;
          this.devicesSubject.next([...devices, device]);
        }),
        catchError((err) => {
          console.error('Error registering device:', err);
          throw err;
        })
      );
  }

  updateDeviceStatus(deviceId: string, isOnline: boolean): Observable<void> {
    return this.http.put<void>(
      `${this.BASE}/biometric-devices/${deviceId}/status`,
      { isOnline }
    ).pipe(
      tap(() => {
        const devices = this.devicesSubject.value
          .map(d => d.deviceId === deviceId ? { ...d, isOnline } : d);
        this.devicesSubject.next(devices);
      }),
      catchError((err) => {
        console.error('Error updating device status:', err);
        throw err;
      })
    );
  }

  getDeviceHeartbeat(deviceId: string): Observable<DeviceHeartbeat> {
    return this.http.get<DeviceHeartbeat>(`${this.BASE}/biometric-devices/${deviceId}/heartbeat`)
      .pipe(
        catchError(() => of({ isOnline: false, lastSeen: new Date().toISOString(), templateCount: 0, storageUsed: 0 }))
      );
  }

  syncDeviceData(deviceId: string, records: AttendanceTableRecord[]): Observable<DeviceSyncLogDTO> {
    const body = { records };
    return this.http.post<DeviceSyncLogDTO>(
      `${this.BASE}/biometric-devices/${deviceId}/sync`,
      body
    ).pipe(
      catchError((err) => {
        console.error('Error syncing device data:', err);
        throw err;
      })
    );
  }

  enrollFingerprint(enrollmentData: Omit<BiometricEnrollmentDTO, 'id' | 'enrollmentDate'>): Observable<BiometricEnrollmentDTO> {
    return this.http.post<BiometricEnrollmentDTO>(
      `${this.BASE}/biometric-enrollments`,
      enrollmentData
    ).pipe(
      tap(enrollment => {
        const enrollments = this.enrollmentsSubject.value;
        this.enrollmentsSubject.next([...enrollments, enrollment]);
      }),
      catchError((err) => {
        console.error('Error enrolling fingerprint:', err);
        throw err;
      })
    );
  }

  getEnrolledFingerprints(employeeId: number): Observable<BiometricEnrollmentDTO[]> {
    return this.http.get<any>(`${this.BASE}/biometric-enrollments/employee/${employeeId}`)
      .pipe(
        map(res => Array.isArray(res) ? res : (res?.enrollments ?? [])),
        catchError(() => of([]))
      );
  }

  validateFingerprintMatch(
    employeeId: number,
    templateData: string
  ): Observable<FingerprintMatchResult> {
    const body = { employeeId, templateData };
    return this.http.post<FingerprintMatchResult>(
      `${this.BASE}/biometric-enrollments/validate-match`,
      body
    ).pipe(
      catchError((err) => {
        console.error('Error validating fingerprint match:', err);
        throw err;
      })
    );
  }

  unrollFingerprint(enrollmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/biometric-enrollments/${enrollmentId}`)
      .pipe(
        tap(() => {
          const enrollments = this.enrollmentsSubject.value
            .filter(e => e.id !== enrollmentId);
          this.enrollmentsSubject.next(enrollments);
        }),
        catchError((err) => {
          console.error('Error unrolling fingerprint:', err);
          throw err;
        })
      );
  }

  storeOfflineRecord(record: AttendanceTableRecord): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        this.offlineQueue.push(record);
        resolve();
        return;
      }

      const request = indexedDB.open('BiometricAttendanceDB');
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['offlineRecords'], 'readwrite');
        const store = transaction.objectStore('offlineRecords');
        const addRequest = store.add(record);

        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => {
          this.offlineQueue.push(record);
          resolve();
        };
      };
      request.onerror = () => {
        this.offlineQueue.push(record);
        resolve();
      };
    });
  }

  syncOfflineRecords(): Observable<AttendanceTableRecord[]> {
    return from(new Promise<AttendanceTableRecord[]>((resolve) => {
      if (!('indexedDB' in window)) {
        resolve(this.offlineQueue);
        this.offlineQueue = [];
        return;
      }

      const request = indexedDB.open('BiometricAttendanceDB');
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['offlineRecords'], 'readonly');
        const store = transaction.objectStore('offlineRecords');
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const records = getAllRequest.result;
          resolve(records);
          this.clearOfflineRecords();
        };
        getAllRequest.onerror = () => {
          resolve(this.offlineQueue);
          this.offlineQueue = [];
        };
      };
      request.onerror = () => {
        resolve(this.offlineQueue);
        this.offlineQueue = [];
      };
    }));
  }

  private clearOfflineRecords(): void {
    if (!('indexedDB' in window)) return;

    const request = indexedDB.open('BiometricAttendanceDB');
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offlineRecords'], 'readwrite');
      const store = transaction.objectStore('offlineRecords');
      store.clear();
    };
  }

  getEnrollmentsByDevice(deviceId: string): Observable<BiometricEnrollmentDTO[]> {
    return this.enrollments$
      .pipe(
        map(enrollments => enrollments.filter(e => e.deviceId === deviceId))
      );
  }

  isEnrolled(employeeId: number, deviceId: string): Observable<boolean> {
    return this.getEnrolledFingerprints(employeeId)
      .pipe(
        map(enrollments => enrollments.some(e => e.deviceId === deviceId && e.enrollmentStatus === 'SUCCESS'))
      );
  }
}
