import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HousekeepingFormComponent } from './housekeeping-form.component';

describe('HousekeepingFormComponent', () => {
  let component: HousekeepingFormComponent;
  let fixture: ComponentFixture<HousekeepingFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HousekeepingFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HousekeepingFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
