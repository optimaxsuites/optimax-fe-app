import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeePayslipListComponent } from './employee-payslip-list.component';

describe('EmployeePayslipListComponent', () => {
  let component: EmployeePayslipListComponent;
  let fixture: ComponentFixture<EmployeePayslipListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmployeePayslipListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EmployeePayslipListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
