import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotelBillsComponent } from './hotel-bills.component';

describe('HotelBillsComponent', () => {
  let component: HotelBillsComponent;
  let fixture: ComponentFixture<HotelBillsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HotelBillsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HotelBillsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
