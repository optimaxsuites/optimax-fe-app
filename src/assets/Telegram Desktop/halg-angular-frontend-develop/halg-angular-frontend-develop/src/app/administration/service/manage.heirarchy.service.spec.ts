import { TestBed } from '@angular/core/testing';

import { ManageHeirarchyService } from './manage.heirarchy.service';

describe('Manage.HeirarchyService', () => {
  let service: ManageHeirarchyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ManageHeirarchyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
