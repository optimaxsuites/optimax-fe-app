import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClockInClockOutComponent } from './clock-in-clock-out.component';

describe('ClockInClockOutComponent', () => {
  let component: ClockInClockOutComponent;
  let fixture: ComponentFixture<ClockInClockOutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ClockInClockOutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClockInClockOutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
