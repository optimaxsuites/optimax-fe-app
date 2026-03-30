import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeOffboardingComponent } from './employee-offboarding.component';

describe('EmployeeOffboardingComponent', () => {
  let component: EmployeeOffboardingComponent;
  let fixture: ComponentFixture<EmployeeOffboardingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmployeeOffboardingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EmployeeOffboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
