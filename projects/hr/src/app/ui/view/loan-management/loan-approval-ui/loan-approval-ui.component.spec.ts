import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanApprovalUiComponent } from './loan-approval-ui.component';

describe('LoanApprovalUiComponent', () => {
  let component: LoanApprovalUiComponent;
  let fixture: ComponentFixture<LoanApprovalUiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoanApprovalUiComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanApprovalUiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
