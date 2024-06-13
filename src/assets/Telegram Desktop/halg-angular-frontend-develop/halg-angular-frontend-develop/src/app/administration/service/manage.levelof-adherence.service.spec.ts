import { TestBed } from '@angular/core/testing';

import { Manage.LevelofAdherenceService } from './manage.levelof-adherence.service';

describe('Manage.LevelofAdherenceService', () => {
  let service: Manage.LevelofAdherenceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Manage.LevelofAdherenceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
