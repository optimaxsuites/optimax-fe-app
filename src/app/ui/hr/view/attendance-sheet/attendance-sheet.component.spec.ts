import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendanceSheetsComponent } from './attendance-sheet.component';

describe('AttendanceSheetsComponent', () => {
  let component: AttendanceSheetsComponent;
  let fixture: ComponentFixture<AttendanceSheetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AttendanceSheetsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttendanceSheetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
