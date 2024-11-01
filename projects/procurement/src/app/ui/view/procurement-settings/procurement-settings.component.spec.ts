import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcurementSettingsComponent } from './procurement-settings.component';

describe('ProcurementSettingsComponent', () => {
  let component: ProcurementSettingsComponent;
  let fixture: ComponentFixture<ProcurementSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProcurementSettingsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProcurementSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
