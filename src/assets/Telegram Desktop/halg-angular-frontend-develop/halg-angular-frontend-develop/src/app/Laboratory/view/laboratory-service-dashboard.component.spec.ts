import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LaboratoryServiceDashboardComponent } from './laboratory-service-dashboard.component';

describe('LaboratoryServiceDashboardComponent', () => {
  let component: LaboratoryServiceDashboardComponent;
  let fixture: ComponentFixture<LaboratoryServiceDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LaboratoryServiceDashboardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LaboratoryServiceDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
