import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotelCheckinformComponent } from './hotel-checkinform.component';

describe('HotelCheckinformComponent', () => {
  let component: HotelCheckinformComponent;
  let fixture: ComponentFixture<HotelCheckinformComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HotelCheckinformComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HotelCheckinformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
