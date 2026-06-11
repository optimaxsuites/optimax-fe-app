import { TestBed } from '@angular/core/testing';

import { HotelScannerserviceService } from './hotel-scannerservice.service';

describe('HotelScannerserviceService', () => {
  let service: HotelScannerserviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HotelScannerserviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
