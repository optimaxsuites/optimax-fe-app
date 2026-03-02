import { TestBed } from '@angular/core/testing';

import { PrStorageService } from './pr-storage.service';

describe('PrStorageService', () => {
  let service: PrStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
