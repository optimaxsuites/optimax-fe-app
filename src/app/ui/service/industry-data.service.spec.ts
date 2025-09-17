import { TestBed } from '@angular/core/testing';

import { IndustryDataService } from './industry-data.service';

describe('IndustryDataService', () => {
  let service: IndustryDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IndustryDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
