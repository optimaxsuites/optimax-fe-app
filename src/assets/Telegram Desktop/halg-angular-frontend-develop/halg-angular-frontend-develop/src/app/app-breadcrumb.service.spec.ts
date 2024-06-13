import { TestBed } from '@angular/core/testing';

import { AppBreadcrumbService } from './app.breadcrumb.service';

describe('AppBreadcrumbService', () => {
  let service: AppBreadcrumbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppBreadcrumbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
