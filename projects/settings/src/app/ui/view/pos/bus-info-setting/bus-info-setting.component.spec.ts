import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusInfoSettingComponent } from './bus-info-setting.component';

describe('BusInfoSettingComponent', () => {
  let component: BusInfoSettingComponent;
  let fixture: ComponentFixture<BusInfoSettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BusInfoSettingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BusInfoSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
