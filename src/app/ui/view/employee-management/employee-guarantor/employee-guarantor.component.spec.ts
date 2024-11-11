import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeGuarantorComponent } from './employee-guarantor.component';

describe('EmployeeGuarantorComponent', () => {
  let component: EmployeeGuarantorComponent;
  let fixture: ComponentFixture<EmployeeGuarantorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmployeeGuarantorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EmployeeGuarantorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
