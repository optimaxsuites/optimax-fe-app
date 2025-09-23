import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotelRoomdetailsComponent } from './hotel-roomdetails.component';

describe('HotelRoomdetailsComponent', () => {
  let component: HotelRoomdetailsComponent;
  let fixture: ComponentFixture<HotelRoomdetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HotelRoomdetailsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HotelRoomdetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
