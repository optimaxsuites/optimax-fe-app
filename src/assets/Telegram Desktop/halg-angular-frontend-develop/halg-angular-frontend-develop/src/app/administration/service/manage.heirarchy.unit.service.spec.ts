import { TestBed } from '@angular/core/testing';

import { ManageHeirarchyUnitService } from './manage.heirarchy.unit.service';

describe('Manage.Heirarchy.UnitService', () => {
  let service: ManageHeirarchyUnitService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ManageHeirarchyUnitService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
