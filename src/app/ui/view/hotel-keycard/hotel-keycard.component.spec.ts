import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotelKeycardComponent } from './hotel-keycard.component';

describe('HotelKeycardComponent', () => {
  let component: HotelKeycardComponent;
  let fixture: ComponentFixture<HotelKeycardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HotelKeycardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HotelKeycardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
