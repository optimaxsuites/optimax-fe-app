import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UserSessionService {

  getCurrentUser(): { id: string; name: string; department: string } | null {

    // userid is stored as a plain string directly
    const userId = sessionStorage.getItem('userid');
    if (!userId) return null;

    // Name and department are inside a JSON object — try each key
    const raw = sessionStorage.getItem('userRegData')
             ?? sessionStorage.getItem('userInfoRegData')
             ?? sessionStorage.getItem('userPrimaryInfoRegData');

    let name = '';
    let department = '';

    if (raw) {
      try {
        const data = JSON.parse(raw);

        // Try common property name patterns — adjust after checking DevTools
        name = data.fullName
            ?? data.fullname
            ?? data.username //from sessionstorage
            ?? data.name
            ?? `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim()
            ?? '';

        department = data.department?.name  // object shape
                  ?? data.department        // plain string
                  ?? data.departmentName
                  ?? '';
      } catch {
        console.warn('Failed to parse user session data');
      }
    }

    return { id: userId, name, department };
  }
}