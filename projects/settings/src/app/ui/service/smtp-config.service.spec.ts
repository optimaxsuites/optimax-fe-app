import { TestBed } from '@angular/core/testing';

import { SmtpConfigService } from './smtp-config.service';

describe('SmtpConfigService', () => {
  let service: SmtpConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SmtpConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
