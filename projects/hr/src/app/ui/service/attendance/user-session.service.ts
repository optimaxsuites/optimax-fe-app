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

    /*const raw = sessionStorage.getItem('userRegData')
             ?? sessionStorage.getItem('userInfoRegData')
             ?? sessionStorage.getItem('userPrimaryInfoRegData');*/

    //let employeeId = userId; // fallback — replace once you confirm the key
    //let name = '';
    //let department = '';
    const primaryRaw = sessionStorage.getItem('userPrimaryInfoRegData');
    if (!primaryRaw) {
    console.warn('userPrimaryInfoRegData not found — cannot resolve employee ID');
    return null;
  }
      try {
        const data = JSON.parse(primaryRaw!);

        // Check DevTools — the employee record ID may be stored as:
        // data.employeeId, data.empId, data.id, data.employeeRecordId etc.
        const employeeId = data.id?.toString() //hopefully 43 is here
                  ?? data.employeeId?.toString();
                  //?? userId;

        if (!employeeId) {
          console.warn('No employee ID found in userPrimaryInfoRegData');
          return null;
        }

        const name = data.fullname  //from userPrimaryInfoRegData
            ?? data.fullName
            //?? data.username //from userRegData
            ?? data.name
            ?? `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim()
            ?? '';

        const department = data.department?.name
                  ?? data.department
                  ?? data.departmentName
                  ?? '';

         console.log('getCurrentUser resolved:', { id: employeeId, userId, name });
        return { id: employeeId, userId, name, department };

      } catch {
        console.warn('Failed to parse user from userPrimaryInfoRegData');
        return null
      }
    }

    
    
  }
