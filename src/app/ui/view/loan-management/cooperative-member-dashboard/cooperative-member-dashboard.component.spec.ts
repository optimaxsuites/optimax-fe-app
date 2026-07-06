import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CooperativeMemberDashboardComponent } from './cooperative-member-dashboard.component';

describe('CooperativeMemberDashboardComponent', () => {
  let component: CooperativeMemberDashboardComponent;
  let fixture: ComponentFixture<CooperativeMemberDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CooperativeMemberDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CooperativeMemberDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
