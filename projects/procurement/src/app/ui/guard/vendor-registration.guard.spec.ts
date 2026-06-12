import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { vendorRegistrationGuard } from './vendor-registration.guard';

describe('vendorRegistrationGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => vendorRegistrationGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
