import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanBalanceIndicatorComponent } from './loan-balance-indicator.component';

describe('LoanBalanceIndicatorComponent', () => {
  let component: LoanBalanceIndicatorComponent;
  let fixture: ComponentFixture<LoanBalanceIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoanBalanceIndicatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanBalanceIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
