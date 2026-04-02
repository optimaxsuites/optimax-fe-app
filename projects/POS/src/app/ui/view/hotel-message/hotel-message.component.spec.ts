import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotelMessageComponent } from './hotel-message.component';

describe('HotelMessageComponent', () => {
  let component: HotelMessageComponent;
  let fixture: ComponentFixture<HotelMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HotelMessageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HotelMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
