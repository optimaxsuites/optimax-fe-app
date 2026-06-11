import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HousekeepingLostitemComponent } from './housekeeping-lostitem.component';

describe('HousekeepingLostitemComponent', () => {
  let component: HousekeepingLostitemComponent;
  let fixture: ComponentFixture<HousekeepingLostitemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HousekeepingLostitemComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HousekeepingLostitemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
