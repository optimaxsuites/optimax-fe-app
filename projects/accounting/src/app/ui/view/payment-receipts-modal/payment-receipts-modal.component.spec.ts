import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentReceiptsModalComponent } from './payment-receipts-modal.component';

describe('PaymentReceiptsModalComponent', () => {
  let component: PaymentReceiptsModalComponent;
  let fixture: ComponentFixture<PaymentReceiptsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PaymentReceiptsModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PaymentReceiptsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
