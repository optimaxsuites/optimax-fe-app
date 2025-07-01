import { TestBed } from '@angular/core/testing';

import { TopProductService } from './top-product.service';

describe('TopProductService', () => {
  let service: TopProductService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TopProductService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
