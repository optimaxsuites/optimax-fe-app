import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PAndISettingComponent } from './p-and-isetting.component';

describe('PAndISettingComponent', () => {
  let component: PAndISettingComponent;
  let fixture: ComponentFixture<PAndISettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PAndISettingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PAndISettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
