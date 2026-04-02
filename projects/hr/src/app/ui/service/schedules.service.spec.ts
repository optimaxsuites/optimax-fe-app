import { TestBed } from '@angular/core/testing';

import { ShiftService } from './schedules.service';

describe('SchedulesService', () => {
  let service: ShiftService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShiftService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
