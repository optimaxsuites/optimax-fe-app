import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepaymentScheduleViewComponent } from './repayment-schedule-view.component';

describe('RepaymentScheduleViewComponent', () => {
  let component: RepaymentScheduleViewComponent;
  let fixture: ComponentFixture<RepaymentScheduleViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RepaymentScheduleViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RepaymentScheduleViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
