import { TestBed } from '@angular/core/testing';

import { MailerServiceService } from './mailer-service.service';

describe('MailerServiceService', () => {
  let service: MailerServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MailerServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
