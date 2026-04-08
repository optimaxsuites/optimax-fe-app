import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HousekeepingLostformComponent } from './housekeeping-lostform.component';

describe('HousekeepingLostformComponent', () => {
  let component: HousekeepingLostformComponent;
  let fixture: ComponentFixture<HousekeepingLostformComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HousekeepingLostformComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HousekeepingLostformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
