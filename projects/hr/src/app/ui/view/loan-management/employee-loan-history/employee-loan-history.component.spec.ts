import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeLoanHistoryComponent } from './employee-loan-history.component';

describe('EmployeeLoanHistoryComponent', () => {
  let component: EmployeeLoanHistoryComponent;
  let fixture: ComponentFixture<EmployeeLoanHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmployeeLoanHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeLoanHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
