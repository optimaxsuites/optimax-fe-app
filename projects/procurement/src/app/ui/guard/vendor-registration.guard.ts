import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const vendorRegistrationGuard: CanActivateFn = () => {
  const router = inject(Router);

  const userData = localStorage.getItem('user');
  const vendorData = localStorage.getItem('vendorDTO');

  const user = userData ? JSON.parse(userData) : null;
  const vendor = vendorData ? JSON.parse(vendorData) : null;

  if (user?.role === 'vendor' && !user?.hasCompletedRegistration) {

    const token = vendor?.registrationToken;

    if (!token) {
      // fallback if token missing
      return router.createUrlTree(['/error']);
    }

    const uuid = crypto.randomUUID();

    return router.createUrlTree([
      '/vendor-portal/vendor-register',
      token,
      uuid
    ]);
  }

  return true;
};
