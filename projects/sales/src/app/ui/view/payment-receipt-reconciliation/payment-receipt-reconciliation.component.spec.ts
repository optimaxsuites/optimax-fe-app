import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentReceiptReconciliationComponent } from './payment-receipt-reconciliation.component';

describe('PaymentReceiptReconciliationComponent', () => {
  let component: PaymentReceiptReconciliationComponent;
  let fixture: ComponentFixture<PaymentReceiptReconciliationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PaymentReceiptReconciliationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentReceiptReconciliationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
