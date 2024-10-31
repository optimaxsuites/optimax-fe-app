import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeePayslipsListComponent } from './employee-payslips-list.component';

describe('EmployeePayslipsListComponent', () => {
  let component: EmployeePayslipsListComponent;
  let fixture: ComponentFixture<EmployeePayslipsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmployeePayslipsListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EmployeePayslipsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
