declare const require: any;
import { Injectable, InjectionToken, Inject, Optional } from '@angular/core';

let _real: any = null;
try {
  _real = require('@auth0/angular-jwt');
} catch (e) {
  _real = null;
}

export const JWT_OPTIONS = new InjectionToken<any>('JWT_OPTIONS');

@Injectable({ providedIn: 'root' })
export class JwtHelperService {
  private _impl: any;
  constructor(@Optional() @Inject(JWT_OPTIONS) options?: any) {
    if (_real && _real.JwtHelperService) {
      this._impl = new _real.JwtHelperService(options);
    } else {
      this._impl = null;
    }
  }
  isTokenExpired(token?: string): boolean {
    if (this._impl && typeof this._impl.isTokenExpired === 'function') return this._impl.isTokenExpired(token);
    return false;
  }
  decodeToken(token?: string): any {
    if (this._impl && typeof this._impl.decodeToken === 'function') return this._impl.decodeToken(token);
    return null;
  }
  getTokenExpirationDate(token?: string): Date | null {
    if (this._impl && typeof this._impl.getTokenExpirationDate === 'function') return this._impl.getTokenExpirationDate(token);
    return null;
  }
}

export function tokenGetter(): string | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem('token');
  } catch (e) {}
  return null;
}
