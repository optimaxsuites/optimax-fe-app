import { TestBed } from '@angular/core/testing';

import { Manage.OppInfectionsService } from './manage.opp-infections.service';

describe('Manage.OppInfectionsService', () => {
  let service: Manage.OppInfectionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Manage.OppInfectionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
