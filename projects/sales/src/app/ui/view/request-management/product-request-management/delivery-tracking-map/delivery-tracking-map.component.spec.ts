import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryTrackingMapComponent } from './delivery-tracking-map.component';

describe('DeliveryTrackingMapComponent', () => {
  let component: DeliveryTrackingMapComponent;
  let fixture: ComponentFixture<DeliveryTrackingMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeliveryTrackingMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeliveryTrackingMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
