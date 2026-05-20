import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UserSessionService {

  getCurrentUser(): {
    id: number;        // HR employee record ID
    userId: number;    // auth/session user ID
    name: string;
    department: string;
  } | null {

    // Logged-in auth user ID
    const userId = Number(sessionStorage.getItem('userid'));

    if (!userId) {
      console.warn('userid not found in sessionStorage');
      return null;
    }

    const primaryRaw = sessionStorage.getItem('userPrimaryInfoRegData');

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
        ?? `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim();

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
    }
  }
}