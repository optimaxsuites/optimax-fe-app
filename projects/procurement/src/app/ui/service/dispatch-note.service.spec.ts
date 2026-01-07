import { TestBed } from '@angular/core/testing';

import { DispatchNoteService } from './dispatch-note.service';

describe('DispatchNoteService', () => {
  let service: DispatchNoteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DispatchNoteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
