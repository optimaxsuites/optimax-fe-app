import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseApprovalComponent } from './expense-approval.component';

describe('ExpenseApprovalComponent', () => {
  let component: ExpenseApprovalComponent;
  let fixture: ComponentFixture<ExpenseApprovalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ExpenseApprovalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExpenseApprovalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
