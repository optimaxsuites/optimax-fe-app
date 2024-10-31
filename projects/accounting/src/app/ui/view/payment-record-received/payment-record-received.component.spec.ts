import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentRecordReceivedComponent } from './payment-record-received.component';

describe('PaymentRecordReceivedComponent', () => {
  let component: PaymentRecordReceivedComponent;
  let fixture: ComponentFixture<PaymentRecordReceivedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PaymentRecordReceivedComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PaymentRecordReceivedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
