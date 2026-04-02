import { TestBed } from '@angular/core/testing';

import { CooperativeService } from './cooperative.service';

describe('CooperativeService', () => {
  let service: CooperativeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CooperativeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
