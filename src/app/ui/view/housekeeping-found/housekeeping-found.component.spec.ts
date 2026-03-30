import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HousekeepingFoundComponent } from './housekeeping-found.component';

describe('HousekeepingFoundComponent', () => {
  let component: HousekeepingFoundComponent;
  let fixture: ComponentFixture<HousekeepingFoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HousekeepingFoundComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HousekeepingFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
