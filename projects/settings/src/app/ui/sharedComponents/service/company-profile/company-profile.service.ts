import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface CompanyProfile {
  userId: number;
  companyName: string;
  industry: string;
  domain: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  currency: string;
  language: string;
  timeZone: string;
  logoUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class CompanyProfileService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly storageKey = 'companyProfile';

  private readonly _profile$ = new BehaviorSubject<CompanyProfile | null>(this.fromStorage());

  readonly companyProfile$ = this._profile$.asObservable();

  constructor(private http: HttpClient) {
    const userId = sessionStorage.getItem('userid');
    if (userId && !this._profile$.value) {
      this.load(+userId).subscribe();
    }
  }

  load(userId: number): Observable<CompanyProfile> {
    return this.http
      .get<any>(`${this.baseUrl}/x/api/v2/us/ur/get/company/profile/${userId}`)
      .pipe(
        tap(raw => {
          const profile: CompanyProfile = {
            ...raw,
            logoUrl: raw.logoUrl ?? raw.companyLogo ?? null,
          };
          this.store(profile);
        }),
        catchError(() => of(this._profile$.value as CompanyProfile))
      );
  }

  updateLogoUrl(logoUrl: string | null): void {
    const current = this._profile$.value;
    if (current) {
      this.store({ ...current, logoUrl });
    }
  }

  refresh(): void {
    const userId = sessionStorage.getItem('userid');
    if (userId) {
      this.load(+userId).subscribe();
    }
  }

  get(): CompanyProfile | null {
    return this._profile$.value;
  }

  clear(): void {
    sessionStorage.removeItem(this.storageKey);
    this._profile$.next(null);
  }

  private store(profile: CompanyProfile): void {
    sessionStorage.setItem(this.storageKey, JSON.stringify(profile));
    this._profile$.next(profile);
  }

  private fromStorage(): CompanyProfile | null {
    const raw = sessionStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : null;
  }
}
