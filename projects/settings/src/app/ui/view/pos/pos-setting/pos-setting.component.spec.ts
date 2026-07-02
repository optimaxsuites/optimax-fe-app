import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosSettingComponent } from './pos-setting.component';

describe('PosSettingComponent', () => {
  let component: PosSettingComponent;
  let fixture: ComponentFixture<PosSettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PosSettingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PosSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
