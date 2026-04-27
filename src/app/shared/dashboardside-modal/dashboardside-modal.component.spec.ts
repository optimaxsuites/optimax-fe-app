import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardsideModalComponent } from './dashboardside-modal.component';

describe('DashboardsideModalComponent', () => {
  let component: DashboardsideModalComponent;
  let fixture: ComponentFixture<DashboardsideModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DashboardsideModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DashboardsideModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
