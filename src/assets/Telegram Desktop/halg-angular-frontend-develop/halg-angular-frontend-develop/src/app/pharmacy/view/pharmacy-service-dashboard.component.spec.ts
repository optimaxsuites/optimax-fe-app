import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PharmacyServiceDashboardComponent } from './pharmacy-service-dashboard.component';

describe('PharmacyServiceDashboardComponent', () => {
  let component: PharmacyServiceDashboardComponent;
  let fixture: ComponentFixture<PharmacyServiceDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PharmacyServiceDashboardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PharmacyServiceDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
