import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanPurposeManagementComponent } from './loan-purpose-management.component';

describe('LoanPurposeManagementComponent', () => {
  let component: LoanPurposeManagementComponent;
  let fixture: ComponentFixture<LoanPurposeManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoanPurposeManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanPurposeManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
