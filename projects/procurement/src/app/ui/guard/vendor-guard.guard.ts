import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const vendorDashboardGuard: CanActivateFn = (route) => {
  const router = inject(Router);

  const uuid = route.paramMap.get('uuid');

  if (!uuid) {
    router.navigate(['/'], { replaceUrl: true });
    return false;
  }

  const isRegistered = localStorage.getItem(`vendor_registered_${uuid}`) === 'true';
  const token = localStorage.getItem(`vendor_token_${uuid}`);

  if (isRegistered) {
    return true;
  }

  if (token) {
    router.navigate(['/vendor-portal/vendor-register', token, uuid], {
      replaceUrl: true
    });
    return false;
  }

  router.navigate(['/'], { replaceUrl: true });
  return false;
};



// export const vendorRegisterGuard: CanActivateFn = (route) => {
//   const router = inject(Router);

//   const uuid = route.paramMap.get('uuid');
//   const token = route.paramMap.get('token');

//   if (!uuid || !token) {
//     router.navigate(['/'], { replaceUrl: true });
//     return false;
//   }

//   const isRegistered = localStorage.getItem(`vendor_registered_${uuid}`) === 'true';

//   if (isRegistered) {
//     router.navigate(['/vendor-portal/dashboard', uuid], {
//       replaceUrl: true
//     });
//     return false;
//   }

//   return true;
// };