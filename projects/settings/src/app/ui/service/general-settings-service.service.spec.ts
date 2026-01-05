import { TestBed } from '@angular/core/testing';

import { GeneralSettingsServiceService } from './general-settings-service.service';

describe('GeneralSettingsServiceService', () => {
  let service: GeneralSettingsServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeneralSettingsServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
