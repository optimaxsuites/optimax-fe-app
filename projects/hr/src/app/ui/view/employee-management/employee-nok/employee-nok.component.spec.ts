import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeNokComponent } from './employee-nok.component';

describe('EmployeeNokComponent', () => {
  let component: EmployeeNokComponent;
  let fixture: ComponentFixture<EmployeeNokComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmployeeNokComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EmployeeNokComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
