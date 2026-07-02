import { TestBed } from '@angular/core/testing';

import { ScheduleserviceService } from './scheduleservice.service';

describe('ScheduleserviceService', () => {
  let service: ScheduleserviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScheduleserviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
