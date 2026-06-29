import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendashboardComponent } from './attendashboard.component';

describe('AttendashboardComponent', () => {
  let component: AttendashboardComponent;
  let fixture: ComponentFixture<AttendashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AttendashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttendashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
