import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HrSettingsComponent } from './hr-settings.component';

describe('HrSettingsComponent', () => {
  let component: HrSettingsComponent;
  let fixture: ComponentFixture<HrSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HrSettingsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HrSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
