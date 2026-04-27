import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeRepaymentScheduleComponent } from './employee-repayment-schedule.component';

describe('EmployeeRepaymentScheduleComponent', () => {
  let component: EmployeeRepaymentScheduleComponent;
  let fixture: ComponentFixture<EmployeeRepaymentScheduleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmployeeRepaymentScheduleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeRepaymentScheduleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
