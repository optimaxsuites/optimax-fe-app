import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfficeHoursComponent } from './office-hours.component';

describe('OfficeHoursComponent', () => {
  let component: OfficeHoursComponent;
  let fixture: ComponentFixture<OfficeHoursComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OfficeHoursComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfficeHoursComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
