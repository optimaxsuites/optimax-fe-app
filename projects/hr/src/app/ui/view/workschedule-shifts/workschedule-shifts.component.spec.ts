import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkscheduleShiftsComponent } from './workschedule-shifts.component';

describe('WorkscheduleShiftsComponent', () => {
  let component: WorkscheduleShiftsComponent;
  let fixture: ComponentFixture<WorkscheduleShiftsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WorkscheduleShiftsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkscheduleShiftsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
