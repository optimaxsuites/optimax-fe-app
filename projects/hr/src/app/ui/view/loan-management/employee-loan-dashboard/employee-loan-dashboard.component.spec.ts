import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeLoanDashboardComponent } from './employee-loan-dashboard.component';

describe('EmployeeLoanDashboardComponent', () => {
  let component: EmployeeLoanDashboardComponent;
  let fixture: ComponentFixture<EmployeeLoanDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmployeeLoanDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeLoanDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
