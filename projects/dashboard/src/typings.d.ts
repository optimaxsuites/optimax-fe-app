declare module '@auth0/angular-jwt' {
  import { InjectionToken } from '@angular/core';

  export const JWT_OPTIONS: any;

  export class JwtHelperService {
    constructor(options?: any);
    isTokenExpired(token?: string): boolean;
    decodeToken(token?: string): any;
    getTokenExpirationDate(token?: string): Date | null;
  }

  export function tokenGetter(): string | null;
}
