import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotelLogsComponent } from './hotel-logs.component';

describe('HotelLogsComponent', () => {
  let component: HotelLogsComponent;
  let fixture: ComponentFixture<HotelLogsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HotelLogsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HotelLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
