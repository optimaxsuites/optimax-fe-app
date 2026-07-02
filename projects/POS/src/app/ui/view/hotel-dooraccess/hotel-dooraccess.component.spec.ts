import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotelDooraccessComponent } from './hotel-dooraccess.component';

describe('HotelDooraccessComponent', () => {
  let component: HotelDooraccessComponent;
  let fixture: ComponentFixture<HotelDooraccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HotelDooraccessComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HotelDooraccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
