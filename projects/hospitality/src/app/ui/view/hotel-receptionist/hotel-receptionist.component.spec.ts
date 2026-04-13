import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotelReceptionistComponent } from './hotel-receptionist.component';

describe('HotelReceptionistComponent', () => {
  let component: HotelReceptionistComponent;
  let fixture: ComponentFixture<HotelReceptionistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HotelReceptionistComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HotelReceptionistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
