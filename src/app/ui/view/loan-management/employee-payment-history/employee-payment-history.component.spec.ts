import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeePaymentHistoryComponent } from './employee-payment-history.component';

describe('EmployeePaymentHistoryComponent', () => {
  let component: EmployeePaymentHistoryComponent;
  let fixture: ComponentFixture<EmployeePaymentHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmployeePaymentHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeePaymentHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
