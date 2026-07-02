import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UserSessionService {

  getCurrentUser(): {
    id: number;        // HR employee record ID
    userId: number;    // auth/session user ID
    name: string;
    department: string;
  } | null {

    const raw = this.getStoredValue('userRegData');
    const data = this.parseUserRegData(raw);
    const userId = Number(
      this.getStoredValue('userid') ??
      data?.id ??
      data?.userId ??
      0
    );

    if (!userId) {
      console.warn('userid not found in browser storage');
      return null;
    }

    if (!data) {
      console.warn('userRegData not found');
      return {
        id: userId,
        userId,
        name: this.getStoredValue('fullname') ?? this.getStoredValue('username') ?? '',
        department: ''
      };
    }

    // IMPORTANT:
    // This MUST be the HR employee record ID
    //const employeeId = Number(
      //data.employeeId
      //?? data.id
      //?? 0
    //);

    console.log('Parsed userRegData:', data);

    return {
      id: Number(data.employeeId ?? data.id ?? userId),
      userId: userId,
      name:
        data.fullname ??
        data.fullName ??
        data.name ??
        this.getStoredValue('fullname') ??
        this.getStoredValue('username') ??
        '',
      department:
        data.department?.name ??
        data.department ??
        ''
    };

    /*const primaryRaw = sessionStorage.getItem('userPrimaryInfoRegData');

    if (!primaryRaw) {
      console.warn('userPrimaryInfoRegData not found');
      return null;
    }

    try {
      const data = JSON.parse(primaryRaw);

      // IMPORTANT:
      // This MUST be the HR employee record ID
      const employeeId = Number(
        data.employeeId
        ?? data.id
      );

      if (!employeeId) {
        console.warn('Employee ID could not be resolved');
        return null;
      }

      const name =
        data.fullname
        ?? data.fullName
        ?? data.name
        ?? `${data.lastName ?? ''} ${data.firstName ?? ''}`.trim();

      const department =
        data.department?.name
        ?? data.department
        ?? data.departmentName
        ?? '';

      console.log('Resolved current user:', {
        employeeId,
        userId,
        name
      });

      return {
        id: employeeId,
        userId,
        //userid: Number(userId)
        name,
        department
      };

    } catch (err) {
      console.error('Failed to parse userPrimaryInfoRegData', err);
      return null;
    }*/
  }

  private getStoredValue(key: string): string | null {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  }

  private parseUserRegData(raw: string | null): any | null {
    if (!raw || raw === 'undefined' || raw === 'null') {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error('Failed to parse userRegData', err);
      return null;
    }
  }
}
