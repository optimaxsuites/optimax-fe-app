import { TestBed } from '@angular/core/testing';

import { UsbPrintService } from './usb-print.service';

describe('UsbPrintService', () => {
  let service: UsbPrintService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UsbPrintService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
