import { TestBed } from '@angular/core/testing';

import { RoomSidebarService } from './room-sidebar.service';

describe('RoomSidebarService', () => {
  let service: RoomSidebarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoomSidebarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
