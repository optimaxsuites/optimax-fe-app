import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotelChangeroomComponent } from './hotel-changeroom.component';

describe('HotelChangeroomComponent', () => {
  let component: HotelChangeroomComponent;
  let fixture: ComponentFixture<HotelChangeroomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HotelChangeroomComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HotelChangeroomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
