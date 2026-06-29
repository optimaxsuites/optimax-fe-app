import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyattendancelistComponent } from './monthlyattendancelist.component';

describe('MonthlyattendancelistComponent', () => {
  let component: MonthlyattendancelistComponent;
  let fixture: ComponentFixture<MonthlyattendancelistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MonthlyattendancelistComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyattendancelistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
