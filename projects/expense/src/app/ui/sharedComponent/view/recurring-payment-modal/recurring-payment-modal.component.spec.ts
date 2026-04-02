import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecurringPaymentModalComponent } from './recurring-payment-modal.component';

describe('RecurringPaymentModalComponent', () => {
  let component: RecurringPaymentModalComponent;
  let fixture: ComponentFixture<RecurringPaymentModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RecurringPaymentModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RecurringPaymentModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
