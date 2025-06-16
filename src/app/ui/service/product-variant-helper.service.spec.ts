import { TestBed } from '@angular/core/testing';

import { ProductVariantHelperService } from './product-variant-helper.service';

describe('ProductVariantHelperService', () => {
  let service: ProductVariantHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductVariantHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
