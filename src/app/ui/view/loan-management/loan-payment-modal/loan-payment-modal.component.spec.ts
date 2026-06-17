import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanPaymentModalComponent } from './loan-payment-modal.component';

describe('LoanPaymentModalComponent', () => {
  let component: LoanPaymentModalComponent;
  let fixture: ComponentFixture<LoanPaymentModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoanPaymentModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanPaymentModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
