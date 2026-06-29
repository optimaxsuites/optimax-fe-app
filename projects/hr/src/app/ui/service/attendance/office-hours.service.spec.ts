import { TestBed } from '@angular/core/testing';

import { OfficeHoursService } from './office-hours.service';

describe('OfficeHoursService', () => {
  let service: OfficeHoursService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OfficeHoursService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
