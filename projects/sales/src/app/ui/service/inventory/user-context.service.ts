// user-context.service.ts
// Create this new file

import { Injectable } from '@angular/core';

export type UserRole = 'ADMIN' | 'BRANCH_MANAGER' | 'STOCK_CLERK' | 'PROCUREMENT_OFFICER' | 'BUDGET_HOLDER';

export interface UserContext {
  id: string;
  name: string;
  role: UserRole;
  branchId?: string;
  branchName?: string;
  email?: string;
}

const MOCK_ROLE_STORAGE_KEY = 'inventory_mock_user_role';

@Injectable({
  providedIn: 'root'
})
export class UserContextService {
  // For demo purposes - this should come from your auth service.
  // The role is persisted to sessionStorage (see setUser()/switchTo*()) so the "View as"
  // switcher in the Inventory tab shell survives a page reload instead of always resetting
  // back to this default.
  private currentUser: UserContext = {
    id: 'usr-1',
    name: 'John Doe',
    role: (sessionStorage.getItem(MOCK_ROLE_STORAGE_KEY) as UserRole) || 'BRANCH_MANAGER',
    branchId: 'br-1',
    branchName: 'Lagos Main Warehouse',
    email: 'john.doe@company.com'
  };

  getUser(): UserContext {
    return this.currentUser;
  }

  getUserRole(): UserRole {
    return this.currentUser.role;
  }

  getUserBranchId(): string | undefined {
    return this.currentUser.branchId;
  }

  getUserBranchName(): string | undefined {
    return this.currentUser.branchName;
  }

  isAdmin(): boolean {
    return this.currentUser.role === 'ADMIN';
  }

  isBranchManager(): boolean {
    return this.currentUser.role === 'BRANCH_MANAGER';
  }

  isStockClerk(): boolean {
    return this.currentUser.role === 'STOCK_CLERK';
  }

  isProcurementOfficer(): boolean {
    return this.currentUser.role === 'PROCUREMENT_OFFICER';
  }

  isBudgetHolder(): boolean {
    return this.currentUser.role === 'BUDGET_HOLDER';
  }

  canApprove(): boolean {
    return ['ADMIN', 'PROCUREMENT_OFFICER', 'BUDGET_HOLDER'].includes(this.currentUser.role);
  }

  canCreateRequest(): boolean {
    return ['ADMIN', 'BRANCH_MANAGER', 'STOCK_CLERK'].includes(this.currentUser.role);
  }

  // For testing - switch user role
  setUser(user: UserContext): void {
    this.currentUser = user;
    sessionStorage.setItem(MOCK_ROLE_STORAGE_KEY, user.role);
  }

  // For testing - switch to admin
  switchToAdmin(): void {
    this.currentUser = {
      ...this.currentUser,
      role: 'ADMIN'
    };
    sessionStorage.setItem(MOCK_ROLE_STORAGE_KEY, 'ADMIN');
  }

  // For testing - switch to branch manager
  switchToBranchManager(): void {
    this.currentUser = {
      ...this.currentUser,
      role: 'BRANCH_MANAGER'
    };
    sessionStorage.setItem(MOCK_ROLE_STORAGE_KEY, 'BRANCH_MANAGER');
  }
}