import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeaveTimelineComponent } from './leave-timeline.component';

describe('LeaveTimelineComponent', () => {
  let component: LeaveTimelineComponent;
  let fixture: ComponentFixture<LeaveTimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LeaveTimelineComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeaveTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
