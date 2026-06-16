import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CooperativeRepaymentScheduleComponent } from './cooperative-repayment-schedule.component';

describe('CooperativeRepaymentScheduleComponent', () => {
  let component: CooperativeRepaymentScheduleComponent;
  let fixture: ComponentFixture<CooperativeRepaymentScheduleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CooperativeRepaymentScheduleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CooperativeRepaymentScheduleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
