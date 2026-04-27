import { CanActivateFn } from '@angular/router';

export const tierGuard: CanActivateFn = (route, state) => {
  return true;
};
