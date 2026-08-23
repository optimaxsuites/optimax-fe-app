import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MovementTrackingComponent } from './movement-tracking.component';

describe('MovementTrackingComponent', () => {
  let component: MovementTrackingComponent;
  let fixture: ComponentFixture<MovementTrackingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MovementTrackingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MovementTrackingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
