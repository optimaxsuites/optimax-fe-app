import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeePaymentReminderComponent } from './employee-payment-reminder.component';

describe('EmployeePaymentReminderComponent', () => {
  let component: EmployeePaymentReminderComponent;
  let fixture: ComponentFixture<EmployeePaymentReminderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmployeePaymentReminderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeePaymentReminderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
