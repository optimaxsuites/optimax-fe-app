import { TestBed } from '@angular/core/testing';

import { AttendancetableService } from './attendancetable.service';

describe('AttendancetableService', () => {
  let service: AttendancetableService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttendancetableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
