import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HousekeepingRecordsComponent } from './housekeeping-records.component';

describe('HousekeepingRecordsComponent', () => {
  let component: HousekeepingRecordsComponent;
  let fixture: ComponentFixture<HousekeepingRecordsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HousekeepingRecordsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HousekeepingRecordsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
