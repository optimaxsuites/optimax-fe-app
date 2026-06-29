import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultipleBookingsComponent } from './multiple-bookings.component';

describe('MultipleBookingsComponent', () => {
  let component: MultipleBookingsComponent;
  let fixture: ComponentFixture<MultipleBookingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MultipleBookingsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MultipleBookingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
