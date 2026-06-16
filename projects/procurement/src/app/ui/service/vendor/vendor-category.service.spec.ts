import { TestBed } from '@angular/core/testing';

import { VendorCategoryService } from './vendor-category.service';

describe('VendorCategoryService', () => {
  let service: VendorCategoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VendorCategoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
