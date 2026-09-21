import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, from } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment.prod';
import {
  BiometricDeviceDTO,
  BiometricEnrollmentDTO,
  BiometricEnrollmentApiDTO,
  DeviceSyncEventsRequest,
  PagedResponse
} from '../../domain/biometric/biometric-device.dto';
import { AttendanceTableRecord } from '../../domain/attendance/attendancetable.dto';

@Injectable({ providedIn: 'root' })
export class BiometricDeviceService {
  private readonly DEVICES_BASE = `${environment.apiBaseUrl}/x/api/v2/hr/biometric-devices`;
  private readonly ENROLLMENTS_BASE = `${environment.apiBaseUrl}/x/api/v2/hr/biometric-enrollments`;

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

  /* --------------------------- Biometric Devices --------------------------- */

  getDevices(): BiometricDeviceDTO[] {
    return this.devicesSubject.value;
  }

  /** GET /biometric-devices */
  getAllDevices(): Observable<BiometricDeviceDTO[]> {
    return this.http.get<PagedResponse<BiometricDeviceDTO>>(this.DEVICES_BASE).pipe(
      map(res => res.content || []),
      tap(devices => this.devicesSubject.next(devices)),
      catchError(error => {
        console.error('Failed to get biometric devices:', error);
        return of([]);
      })
    );
  }

  /** GET /biometric-devices/{id} */
  getDevice(id: number): Observable<BiometricDeviceDTO | null> {
    return this.http.get<BiometricDeviceDTO>(`${this.DEVICES_BASE}/${id}`).pipe(
      catchError(error => {
        console.error(`Failed to get biometric device ${id}:`, error);
        return of(null);
      })
    );
  }

  /** GET /biometric-devices/by-device-id/{deviceId} */
  getDeviceByDeviceId(deviceId: string): Observable<BiometricDeviceDTO | null> {
    return this.http.get<BiometricDeviceDTO>(`${this.DEVICES_BASE}/by-device-id/${deviceId}`).pipe(
      catchError(error => {
        console.error(`Failed to get biometric device ${deviceId}:`, error);
        return of(null);
      })
    );
  }

  /** GET /biometric-devices/branch/{branchId} */
  getDevicesByBranch(branchId: string): Observable<BiometricDeviceDTO[]> {
    return this.http.get<PagedResponse<BiometricDeviceDTO>>(`${this.DEVICES_BASE}/branch/${branchId}`).pipe(
      map(res => res.content || []),
      catchError(error => {
        console.error(`Failed to get biometric devices for branch ${branchId}:`, error);
        return of([]);
      })
    );
  }

  /** POST /biometric-devices */
  registerDevice(device: BiometricDeviceDTO): Observable<BiometricDeviceDTO> {
    return this.http.post<BiometricDeviceDTO>(this.DEVICES_BASE, device).pipe(
      tap(created => {
        this.devicesSubject.next([...this.devicesSubject.value, created]);
      }),
      catchError((err) => {
        console.error('Error registering device:', err);
        throw err;
      })
    );
  }

  /** PUT /biometric-devices/{id} */
  updateDevice(id: number, device: BiometricDeviceDTO): Observable<BiometricDeviceDTO> {
    return this.http.put<BiometricDeviceDTO>(`${this.DEVICES_BASE}/${id}`, device).pipe(
      tap(updated => {
        const devices = this.devicesSubject.value.map(d => d.id === id ? updated : d);
        this.devicesSubject.next(devices);
      }),
      catchError((err) => {
        console.error('Error updating device:', err);
        throw err;
      })
    );
  }

  /** DELETE /biometric-devices/{id} */
  deleteDevice(id: number): Observable<void> {
    return this.http.delete<void>(`${this.DEVICES_BASE}/${id}`).pipe(
      tap(() => {
        const devices = this.devicesSubject.value.filter(d => d.id !== id);
        this.devicesSubject.next(devices);
      }),
      catchError((err) => {
        console.error('Error deleting device:', err);
        throw err;
      })
    );
  }

  /** POST /biometric-devices/heartbeat — device reports its own current full status. */
  sendHeartbeat(device: BiometricDeviceDTO): Observable<BiometricDeviceDTO> {
    return this.http.post<BiometricDeviceDTO>(`${this.DEVICES_BASE}/heartbeat`, device).pipe(
      tap(updated => {
        const devices = this.devicesSubject.value.map(d => d.id === updated.id ? updated : d);
        this.devicesSubject.next(devices);
      }),
      catchError((err) => {
        console.error('Error sending device heartbeat:', err);
        throw err;
      })
    );
  }

  /** POST /biometric-devices/{deviceId}/sync-events */
  syncDeviceEvents(request: DeviceSyncEventsRequest): Observable<unknown> {
    return this.http.post(`${this.DEVICES_BASE}/${request.deviceId}/sync-events`, request).pipe(
      catchError((err) => {
        console.error('Error syncing device events:', err);
        throw err;
      })
    );
  }

  /* ------------------------- Biometric Enrollments -------------------------- */

  /** GET /biometric-enrollments */
  getAllEnrollments(): Observable<BiometricEnrollmentDTO[]> {
    return this.http.get<PagedResponse<BiometricEnrollmentApiDTO>>(this.ENROLLMENTS_BASE).pipe(
      map(res => (res.content || []).map(dto => this.toUiEnrollment(dto))),
      tap(enrollments => this.enrollmentsSubject.next(enrollments)),
      catchError(error => {
        console.error('Failed to get biometric enrollments:', error);
        return of([]);
      })
    );
  }

  /** GET /biometric-enrollments/{id} */
  getEnrollment(id: number): Observable<BiometricEnrollmentDTO | null> {
    return this.http.get<BiometricEnrollmentApiDTO>(`${this.ENROLLMENTS_BASE}/${id}`).pipe(
      map(dto => this.toUiEnrollment(dto)),
      catchError(error => {
        console.error(`Failed to get biometric enrollment ${id}:`, error);
        return of(null);
      })
    );
  }

  /** POST /biometric-enrollments */
  enrollFingerprint(enrollmentData: Omit<BiometricEnrollmentDTO, 'id' | 'enrollmentDate'>): Observable<BiometricEnrollmentDTO> {
    return this.http.post<BiometricEnrollmentApiDTO>(this.ENROLLMENTS_BASE, enrollmentData).pipe(
      map(dto => this.toUiEnrollment(dto)),
      tap(enrollment => {
        this.enrollmentsSubject.next([...this.enrollmentsSubject.value, enrollment]);
      }),
      catchError((err) => {
        console.error('Error enrolling fingerprint:', err);
        throw err;
      })
    );
  }

  /** DELETE /biometric-enrollments/{id} */
  unrollFingerprint(enrollmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.ENROLLMENTS_BASE}/${enrollmentId}`).pipe(
      tap(() => {
        const enrollments = this.enrollmentsSubject.value.filter(e => e.id !== enrollmentId);
        this.enrollmentsSubject.next(enrollments);
      }),
      catchError((err) => {
        console.error('Error unrolling fingerprint:', err);
        throw err;
      })
    );
  }

  /** GET /biometric-enrollments/device/{deviceId} */
  getEnrollmentsByDevice(deviceId: string): Observable<BiometricEnrollmentDTO[]> {
    return this.http.get<PagedResponse<BiometricEnrollmentApiDTO>>(`${this.ENROLLMENTS_BASE}/device/${deviceId}`).pipe(
      map(res => (res.content || []).map(dto => this.toUiEnrollment(dto))),
      catchError(error => {
        console.error(`Failed to get enrollments for device ${deviceId}:`, error);
        return of([]);
      })
    );
  }

  /** GET /biometric-enrollments/employee/{employeeId} */
  getEnrolledFingerprints(employeeId: number): Observable<BiometricEnrollmentDTO[]> {
    return this.http.get<PagedResponse<BiometricEnrollmentApiDTO>>(`${this.ENROLLMENTS_BASE}/employee/${employeeId}`).pipe(
      map(res => (res.content || []).map(dto => this.toUiEnrollment(dto))),
      catchError(error => {
        console.error(`Failed to get enrollments for employee ${employeeId}:`, error);
        return of([]);
      })
    );
  }

  isEnrolled(employeeId: number, deviceId: string): Observable<boolean> {
    return this.getEnrolledFingerprints(employeeId).pipe(
      map(enrollments => enrollments.some(e => e.deviceId === deviceId && e.enrollmentStatus === 'SUCCESS'))
    );
  }

  private toUiEnrollment(dto: BiometricEnrollmentApiDTO): BiometricEnrollmentDTO {
    return {
      id: dto.id,
      employeeId: dto.employeeId?.id ?? 0,
      deviceId: dto.deviceId,
      templateData: dto.templateData,
      enrollmentDate: dto.enrollmentDate,
      enrolledBy: dto.enrolledBy,
      templateQuality: dto.templateQuality,
      isFallback: dto.isFallback,
      enrollmentStatus: dto.enrollmentStatus
    };
  }

  /* ---------------------------- Offline queueing ----------------------------- */

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
}
