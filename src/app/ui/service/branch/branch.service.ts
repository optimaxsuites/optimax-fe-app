import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment.prod';
import { BranchDTO, BranchLocationDTO } from '../../domain/branch/branch.dto';

@Injectable({ providedIn: 'root' })
export class BranchService {
  private readonly BASE = `${environment.apiBaseUrl}/x/api/v2/hr`;
  private branchesSubject = new BehaviorSubject<BranchDTO[]>([]);
  private selectedBranchSubject = new BehaviorSubject<BranchDTO | null>(null);

  branches$ = this.branchesSubject.asObservable();
  selectedBranch$ = this.selectedBranchSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadBranches();
  }

  private loadBranches(): void {
    this.getAllBranches().subscribe({
      next: (branches) => this.branchesSubject.next(branches),
      error: (err) => {
        console.error('Failed to load branches:', err);
        this.branchesSubject.next([]);
      }
    });
  }

  getBranches(): BranchDTO[] {
    return this.branchesSubject.value;
  }

  selectBranch(branch: BranchDTO | null): void {
    this.selectedBranchSubject.next(branch);
  }

  getSelectedBranch(): BranchDTO | null {
    return this.selectedBranchSubject.value;
  }

  getAllBranches(): Observable<BranchDTO[]> {
    return this.http.get<any>(`${this.BASE}/branches`)
      .pipe(
        map(res => Array.isArray(res) ? res : (res?.content ?? [])),
        tap(branches => this.branchesSubject.next(branches)),
        catchError(() => {
          console.error('Error fetching branches');
          return of([]);
        })
      );
  }

  getBranchById(branchId: number): Observable<BranchDTO> {
    return this.http.get<BranchDTO>(`${this.BASE}/branches/${branchId}`)
      .pipe(
        catchError(() => of({} as BranchDTO))
      );
  }

  getEmployeePrimaryBranch(employeeId: number): Observable<BranchDTO | null> {
    return this.http.get<any>(`${this.BASE}/employees/${employeeId}/primary-branch`)
      .pipe(
        map(res => res as BranchDTO),
        catchError(() => of(null))
      );
  }

  getEmployeeAssignedBranches(employeeId: number): Observable<BranchDTO[]> {
    return this.http.get<any>(`${this.BASE}/employees/${employeeId}/branches`)
      .pipe(
        map(res => Array.isArray(res) ? res : (res?.branches ?? [])),
        catchError(() => of([]))
      );
  }

  createBranch(branch: Omit<BranchDTO, 'id' | 'createdAt' | 'updatedAt'>): Observable<BranchDTO> {
    return this.http.post<BranchDTO>(`${this.BASE}/branches`, branch)
      .pipe(
        tap(newBranch => {
          const branches = this.branchesSubject.value;
          this.branchesSubject.next([...branches, newBranch]);
        }),
        catchError((err) => {
          console.error('Error creating branch:', err);
          throw err;
        })
      );
  }

  updateBranch(branchId: number, branch: Partial<BranchDTO>): Observable<BranchDTO> {
    return this.http.put<BranchDTO>(`${this.BASE}/branches/${branchId}`, branch)
      .pipe(
        tap(updatedBranch => {
          const branches = this.branchesSubject.value
            .map(b => b.id === branchId ? updatedBranch : b);
          this.branchesSubject.next(branches);
        }),
        catchError((err) => {
          console.error('Error updating branch:', err);
          throw err;
        })
      );
  }

  deleteBranch(branchId: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/branches/${branchId}`)
      .pipe(
        tap(() => {
          const branches = this.branchesSubject.value
            .filter(b => b.id !== branchId);
          this.branchesSubject.next(branches);
        }),
        catchError((err) => {
          console.error('Error deleting branch:', err);
          throw err;
        })
      );
  }

  calculateDistanceToBranch(
    userLat: number,
    userLng: number,
    branchId: number
  ): Observable<number> {
    const branch = this.branchesSubject.value.find(b => b.id === branchId);

    if (!branch) {
      return this.getBranchById(branchId)
        .pipe(
          map(b => this.haversineDistance(userLat, userLng, b.latitude, b.longitude))
        );
    }

    return of(this.haversineDistance(userLat, userLng, branch.latitude, branch.longitude));
  }

  calculateDistanceToBranchLocation(
    userLat: number,
    userLng: number,
    branchLocation: BranchLocationDTO
  ): number {
    return this.haversineDistance(userLat, userLng, branchLocation.latitude, branchLocation.longitude);
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

  searchBranches(query: string): Observable<BranchDTO[]> {
    return this.branches$
      .pipe(
        map(branches => branches.filter(b =>
          b.name.toLowerCase().includes(query.toLowerCase()) ||
          b.code.toLowerCase().includes(query.toLowerCase()) ||
          b.address.toLowerCase().includes(query.toLowerCase())
        ))
      );
  }

  isEmployeeInBranch(employeeId: number, branchId: number): Observable<boolean> {
    return this.getEmployeeAssignedBranches(employeeId)
      .pipe(
        map(branches => branches.some(b => b.id === branchId))
      );
  }
}
