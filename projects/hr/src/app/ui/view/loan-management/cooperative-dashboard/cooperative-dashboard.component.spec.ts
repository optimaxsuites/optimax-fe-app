import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CooperativeDashboardComponent } from './cooperative-dashboard.component';

describe('CooperativeDashboardComponent', () => {
  let component: CooperativeDashboardComponent;
  let fixture: ComponentFixture<CooperativeDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CooperativeDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CooperativeDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
