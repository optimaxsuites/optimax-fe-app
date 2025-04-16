import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotelMaintenancenoteComponent } from './hotel-maintenancenote.component';

describe('HotelMaintenancenoteComponent', () => {
  let component: HotelMaintenancenoteComponent;
  let fixture: ComponentFixture<HotelMaintenancenoteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HotelMaintenancenoteComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HotelMaintenancenoteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
