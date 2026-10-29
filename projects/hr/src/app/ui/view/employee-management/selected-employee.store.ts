import { Injectable } from '@angular/core';

/** Where the selected employee used to be kept. Removed on startup so old copies don't linger. */
const LEGACY_STORAGE_KEY = 'employeeInView';

/**
 * The employee open in the directory's profile drawer, shared with its tabs. Kept in memory only:
 * the record includes bank details, NIN and BVN, which must not stay on the device after logout.
 * Tabs should use it for the id and fetch their own data, since this copy can be out of date.
 */
@Injectable({ providedIn: 'root' })
export class SelectedEmployeeStore {
  private employee: any = null;

  constructor() {
    try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch {}
  }

  get(): any {
    return this.employee;
  }

  get id(): number | null {
    const id = this.employee?.id;
    return id === null || id === undefined || id === '' ? null : id;
  }

  set(employee: any): void {
    this.employee = employee ?? null;
  }

  clear(): void {
    this.employee = null;
  }
}
