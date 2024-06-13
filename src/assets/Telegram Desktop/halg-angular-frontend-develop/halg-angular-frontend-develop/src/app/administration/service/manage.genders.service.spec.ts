import { TestBed } from '@angular/core/testing';

import { ManageGendersService } from './manage.genders.service';

describe('Manage.GendersService', () => {
  let service: ManageGendersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ManageGendersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
