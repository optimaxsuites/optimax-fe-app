import { TestBed } from '@angular/core/testing';

import { MetadataConfigService } from './metadata-config.service';

describe('MetadataConfigService', () => {
  let service: MetadataConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MetadataConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
