import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotelRoomlistComponent } from './hotel-roomlist.component';

describe('HotelRoomlistComponent', () => {
  let component: HotelRoomlistComponent;
  let fixture: ComponentFixture<HotelRoomlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HotelRoomlistComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HotelRoomlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
