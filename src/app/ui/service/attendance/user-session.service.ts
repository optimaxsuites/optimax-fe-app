import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UserSessionService {

  getCurrentUser(): { 
    id: string;         // employee record ID (for API calls)
    userId: string;     // user account ID (for auth/session)
    name: string; 
    department: string 
  } | null {

    //userid stored as a plain string directly
    const userId = sessionStorage.getItem('userid');
    if (!userId) return null;

    const raw = sessionStorage.getItem('userRegData')
             ?? sessionStorage.getItem('userInfoRegData')
             ?? sessionStorage.getItem('userPrimaryInfoRegData');

    let employeeId = userId; // fallback — replace once you confirm the key
    let name = '';
    let department = '';

    if (raw) {
      try {
        const data = JSON.parse(raw);

        // ⚠️ Check DevTools — the employee record ID may be stored as:
        // data.employeeId, data.empId, data.id, data.employeeRecordId etc.
        employeeId = data.employeeId?.toString()
                  ?? data.empId?.toString()
                  ?? data.id?.toString()
                  ?? userId;

        name = data.fullName
            ?? data.fullname
            ?? data.username //from sessionstorage
            ?? data.name
            ?? `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim()
            ?? '';

        department = data.department?.name
                  ?? data.department
                  ?? data.departmentName
                  ?? '';
      } catch {
        console.warn('Failed to parse user session data');
      }
    }

    return { id: employeeId, userId, name, department };
  }
}