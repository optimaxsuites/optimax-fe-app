import { TestBed } from '@angular/core/testing';

import { TransactionCardService } from './transaction-card.service';

describe('TransactionCardService', () => {
  let service: TransactionCardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransactionCardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
