import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliverTrackingAndFulfilmentComponent } from './deliver-tracking-and-fulfilment.component';

describe('DeliverTrackingAndFulfilmentComponent', () => {
  let component: DeliverTrackingAndFulfilmentComponent;
  let fixture: ComponentFixture<DeliverTrackingAndFulfilmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeliverTrackingAndFulfilmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeliverTrackingAndFulfilmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
