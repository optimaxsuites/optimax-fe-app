import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanBalanceIndicatorsComponent } from './loan-balance-indicators.component';

describe('LoanBalanceIndicatorsComponent', () => {
  let component: LoanBalanceIndicatorsComponent;
  let fixture: ComponentFixture<LoanBalanceIndicatorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoanBalanceIndicatorsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanBalanceIndicatorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
