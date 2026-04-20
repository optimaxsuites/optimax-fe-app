import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanGracePeriodRequestsManagementComponent } from './loan-grace-period-requests-management.component';

describe('LoanGracePeriodRequestManagementComponent', () => {
  let component: LoanGracePeriodRequestsManagementComponent;
  let fixture: ComponentFixture<LoanGracePeriodRequestsManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoanGracePeriodRequestsManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanGracePeriodRequestsManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
