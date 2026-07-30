import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SessionExpiredService {
  private _expired$ = new Subject<void>();
  readonly expired$ = this._expired$.asObservable();

  trigger(): void {
    this._expired$.next();
  }
}
