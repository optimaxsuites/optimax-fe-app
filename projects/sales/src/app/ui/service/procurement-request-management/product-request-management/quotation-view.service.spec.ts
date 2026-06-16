import { TestBed } from '@angular/core/testing';

import { QuotationViewService } from './quotation-view.service';

describe('QuotationViewService', () => {
  let service: QuotationViewService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QuotationViewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
