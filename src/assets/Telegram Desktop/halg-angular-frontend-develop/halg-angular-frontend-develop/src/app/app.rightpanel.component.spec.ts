import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppRightPanelComponent } from './app-right-panel.component';

describe('AppRightPanelComponent', () => {
  let component: AppRightPanelComponent;
  let fixture: ComponentFixture<AppRightPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AppRightPanelComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppRightPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
