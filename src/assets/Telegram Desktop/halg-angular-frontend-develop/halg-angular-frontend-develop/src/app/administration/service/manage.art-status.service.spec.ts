import { TestBed } from '@angular/core/testing';

import { Manage.ArtStatusService } from './manage.art-status.service';

describe('Manage.ArtStatusService', () => {
  let service: Manage.ArtStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Manage.ArtStatusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
