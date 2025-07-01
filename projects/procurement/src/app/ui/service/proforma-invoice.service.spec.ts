import { TestBed } from '@angular/core/testing';

import { ProformaInvoiceService } from './proforma-invoice.service';

describe('ProformaInvoiceService', () => {
  let service: ProformaInvoiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProformaInvoiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
