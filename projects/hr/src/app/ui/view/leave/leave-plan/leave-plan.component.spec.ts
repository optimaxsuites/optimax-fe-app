import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeavePlanComponent } from './leave-plan.component';

describe('LeavePlanComponent', () => {
  let component: LeavePlanComponent;
  let fixture: ComponentFixture<LeavePlanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LeavePlanComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeavePlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
