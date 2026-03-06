import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendancefilterComponent } from './attendancefilter.component';

describe('AttendancefilterComponent', () => {
  let component: AttendancefilterComponent;
  let fixture: ComponentFixture<AttendancefilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AttendancefilterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttendancefilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
