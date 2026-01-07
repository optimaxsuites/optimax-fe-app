import { TestBed } from '@angular/core/testing';

import { PosServiceService } from './pos-service.service';

describe('PosServiceService', () => {
  let service: PosServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PosServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
