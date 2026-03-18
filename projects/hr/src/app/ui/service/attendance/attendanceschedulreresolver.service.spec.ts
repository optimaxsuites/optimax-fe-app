import { TestBed } from '@angular/core/testing';

import { AttendanceschedulreresolverService } from './attendanceschedulreresolver.service';

describe('AttendanceschedulreresolverService', () => {
  let service: AttendanceschedulreresolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttendanceschedulreresolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
