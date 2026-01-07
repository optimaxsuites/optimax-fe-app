// auth-state.service.ts - Updated version
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service'; // Import AuthService

export interface User {
  name: string;
  isGuest: boolean;
  email?: string;
  username?: string;
  preferences?: any;
  requiresVerification?: boolean;
  posCustomerId?: number; // Sticky ID for POS operations
}

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private userSubject = new BehaviorSubject<User>({ name: 'Guest', isGuest: true });
  public user$: Observable<User> = this.userSubject.asObservable();
  
  private readonly SESSION_KEY = 'store_user_session';
  private readonly LOCAL_KEY = 'store_user_local';
  
  constructor(private authService: AuthService) {
    this.loadUserFromStorage();
  }
  
  private loadUserFromStorage(): void {
    // Priority 1: Check if user is authenticated via AuthService
    if (this.authService.isAuthenticated()) {
      const authUser = this.authService.getCurrentUser();
      if (authUser) {
        const userData: User = {
          name: authUser.username,
          isGuest: false,
          username: authUser.username,
          email: authUser.email,
          requiresVerification: !authUser.verified,
          posCustomerId: authUser.posCustomerId // Load sticky ID if exists
        };
        
        console.log('Loaded authenticated user from AuthService:', userData);
        this.userSubject.next(userData);
        
        // Also store in our session storage
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(userData));
        return;
      }
    }
    
    // Priority 2: Check sessionStorage for our stored user
    let storedUser = sessionStorage.getItem(this.SESSION_KEY);
    
    if (storedUser) {
      try {
        const userData: User = JSON.parse(storedUser);
        console.log('Loaded user from session storage:', userData);
        this.userSubject.next(userData);
        return;
      } catch (error) {
        console.error('Error parsing session user:', error);
        sessionStorage.removeItem(this.SESSION_KEY);
      }
    }
    
    // Priority 3: Check localStorage for persistent login
    storedUser = localStorage.getItem(this.LOCAL_KEY);
    
    if (storedUser) {
      try {
        const userData: User = JSON.parse(storedUser);
        console.log('Loaded user from localStorage:', userData);
        
        // Move to sessionStorage for current session
        sessionStorage.setItem(this.SESSION_KEY, storedUser);
        
        this.userSubject.next(userData);
        return;
      } catch (error) {
        console.error('Error parsing localStorage user:', error);
        localStorage.removeItem(this.LOCAL_KEY);
      }
    }
    
    // Priority 4: Check for remembered username
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    if (rememberedUsername) {
      console.log('Found remembered username:', rememberedUsername);
      // User is not logged in but has remembered username
    }
    
    // Default: Guest user
    this.setGuestUser();
  }
  
  setUser(user: User): void {
    const userString = JSON.stringify(user);
    
    if (!user.isGuest) {
      // Store in sessionStorage for active session
      sessionStorage.setItem(this.SESSION_KEY, userString);
      
      // Check if user wants persistent login
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      if (rememberMe) {
        // Store in localStorage for persistence
        localStorage.setItem(this.LOCAL_KEY, userString);
        console.log('User stored in localStorage (remember me)');
      } else {
        // Remove from localStorage if exists
        localStorage.removeItem(this.LOCAL_KEY);
      }
      
      // If user doesn't require verification, store token in AuthService
      if (!user.requiresVerification) {
        // Note: The actual token is stored by AuthService during login
      }
    } else {
      // Guest user - only store in session
      sessionStorage.setItem(this.SESSION_KEY, userString);
      localStorage.removeItem(this.LOCAL_KEY);
    }
    
    this.userSubject.next(user);
    console.log('User set in auth state:', user);
  }
  
  setGuestUser(): void {
    const guestUser: User = { name: 'Guest', isGuest: true };
    this.userSubject.next(guestUser);
  }
  
  logout(): void {
    // Use AuthService logout to clear tokens
    this.authService.logout();
    
    // Clear session but keep localStorage for "remember me"
    sessionStorage.removeItem(this.SESSION_KEY);
    
    // Check if user wants to stay remembered
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    if (!rememberMe) {
      localStorage.removeItem(this.LOCAL_KEY);
    }
    
    this.setGuestUser();
    console.log('User logged out (session cleared)');
  }
  
  logoutCompletely(): void {
    // Clear everything including remember me
    this.authService.logout();
    sessionStorage.clear();
    localStorage.removeItem(this.LOCAL_KEY);
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('rememberedUsername');
    localStorage.removeItem('rememberedEmail');
    
    this.setGuestUser();
    console.log('User completely logged out');
  }
  
  getCurrentUser(): User {
    return this.userSubject.value;
  }
  
  isAuthenticated(): boolean {
    return !this.userSubject.value.isGuest && !this.userSubject.value.requiresVerification;
  }
  
  // Helper to check if user has active session
  hasActiveSession(): boolean {
    return !!sessionStorage.getItem(this.SESSION_KEY);
  }
  
  // Helper to check if user has persistent login
  hasPersistentLogin(): boolean {
    return !!localStorage.getItem(this.LOCAL_KEY);
  }
  
  // Check if user needs verification
  needsVerification(): boolean {
    return this.userSubject.value.requiresVerification === true;
  }
}