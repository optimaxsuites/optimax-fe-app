import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusTrackingComponent } from './status-tracking.component';

describe('StatusTrackingComponent', () => {
  let component: StatusTrackingComponent;
  let fixture: ComponentFixture<StatusTrackingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StatusTrackingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatusTrackingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
