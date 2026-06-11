import { TestBed } from '@angular/core/testing';

import { RequestDraftService } from './request-draft.service';

describe('RequestDraftService', () => {
  let service: RequestDraftService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RequestDraftService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
