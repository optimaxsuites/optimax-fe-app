import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeavePlanningDashboardComponent } from './leave-planning-dashboard.component';

describe('LeavePlanningDashboardComponent', () => {
  let component: LeavePlanningDashboardComponent;
  let fixture: ComponentFixture<LeavePlanningDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LeavePlanningDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeavePlanningDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
