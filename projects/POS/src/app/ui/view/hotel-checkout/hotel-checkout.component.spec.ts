import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotelCheckoutComponent } from './hotel-checkout.component';

describe('HotelCheckoutComponent', () => {
  let component: HotelCheckoutComponent;
  let fixture: ComponentFixture<HotelCheckoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HotelCheckoutComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HotelCheckoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
