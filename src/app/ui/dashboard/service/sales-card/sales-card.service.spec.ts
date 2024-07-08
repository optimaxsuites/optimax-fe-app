import { TestBed } from '@angular/core/testing';

import { SalesCardService } from './sales-card.service';

describe('SalesCardService', () => {
  let service: SalesCardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SalesCardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
