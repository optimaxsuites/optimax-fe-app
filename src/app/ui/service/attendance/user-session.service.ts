import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserSessionService {

  constructor() { }
  getCurrentUser(): { id: string; name: string; department: string } | null {
    const raw = sessionStorage.getItem('userRegData')      // try this first
           ?? sessionStorage.getItem('userInfoRegData')    // fallback
           ?? sessionStorage.getItem('userPrimaryInfoRegData'); // fallback

    if (!raw) return null;

    const data = JSON.parse(raw);

    return {
      id:         data.userId     ?? data.id,
      name:       data.fullName   ?? data.name,
      department: data.department
    };
  }
}
