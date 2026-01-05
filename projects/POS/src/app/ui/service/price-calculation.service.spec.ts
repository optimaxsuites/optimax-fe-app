import { TestBed } from '@angular/core/testing';

import { PriceCalculationService } from './price-calculation.service';

describe('PriceCalculationService', () => {
  let service: PriceCalculationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PriceCalculationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
