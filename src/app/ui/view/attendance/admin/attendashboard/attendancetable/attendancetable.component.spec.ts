import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendancetableComponent } from './attendancetable.component';

describe('AttendancetableComponent', () => {
  let component: AttendancetableComponent;
  let fixture: ComponentFixture<AttendancetableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AttendancetableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttendancetableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
