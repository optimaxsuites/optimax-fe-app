import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotelAdmintableComponent } from './hotel-admintable.component';

describe('HotelAdmintableComponent', () => {
  let component: HotelAdmintableComponent;
  let fixture: ComponentFixture<HotelAdmintableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HotelAdmintableComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HotelAdmintableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
