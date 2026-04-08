import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotelExtendstayComponent } from './hotel-extendstay.component';

describe('HotelExtendstayComponent', () => {
  let component: HotelExtendstayComponent;
  let fixture: ComponentFixture<HotelExtendstayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HotelExtendstayComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HotelExtendstayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
