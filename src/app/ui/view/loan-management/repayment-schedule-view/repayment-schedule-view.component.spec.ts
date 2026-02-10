import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepaymentScheduleComponent } from './repayment-schedule-view.component';

describe('RepaymentScheduleViewComponent', () => {
  let component: RepaymentScheduleComponent;
  let fixture: ComponentFixture<RepaymentScheduleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RepaymentScheduleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RepaymentScheduleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
