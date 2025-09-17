import { TestBed } from '@angular/core/testing';

import { AppRegisterServiceService } from './app-register-service.service';

describe('AppRegisterServiceService', () => {
  let service: AppRegisterServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppRegisterServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
