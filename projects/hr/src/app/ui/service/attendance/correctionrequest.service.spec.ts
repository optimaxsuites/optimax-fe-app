import { TestBed } from '@angular/core/testing';

import { CorrectionrequestService } from './correctionrequest.service';

describe('CorrectionrequestService', () => {
  let service: CorrectionrequestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CorrectionrequestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
