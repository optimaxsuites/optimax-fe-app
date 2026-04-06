import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeInterestAcceptanceComponent } from './employee-interest-acceptance.component';

describe('EmployeeInterestAcceptanceComponent', () => {
  let component: EmployeeInterestAcceptanceComponent;
  let fixture: ComponentFixture<EmployeeInterestAcceptanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmployeeInterestAcceptanceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeInterestAcceptanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
