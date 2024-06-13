import { TestBed } from '@angular/core/testing';

import { ManageUserRoleService } from './manage.user.role.service';

describe('Manage.User.RoleService', () => {
  let service: ManageUserRoleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ManageUserRoleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
