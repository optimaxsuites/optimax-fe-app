import { TestBed } from '@angular/core/testing';

import { AttendashboardService } from './attendashboard.service';

describe('AttendashboardService', () => {
  let service: AttendashboardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttendashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
