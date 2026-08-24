// admin-only.guard.ts
// ============================================================
// Blocks Branch Managers from Admin-only inventory pages.
//
// Per the Admin vs. Branch Manager permission matrix, Branch Managers can
// create requests/transfers and manage their own branch's inventory, but
// cannot approve restock requests, approve/complete transfers, or manage
// reorder thresholds — those actions stay Admin-only. This guard is applied
// to those routes; everyone else (Admin, and any other role) passes through.
// ============================================================

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserContextService } from './user-context.service';

export const adminOnlyGuard: CanActivateFn = () => {
  const userContext = inject(UserContextService);
  const router = inject(Router);

  if (!userContext.isBranchManager()) {
    return true;
  }

  router.navigate(['/admin/sales/commerce/inventory/branch-manager']);
  return false;
};
