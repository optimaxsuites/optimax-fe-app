import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckoutKitchenHistoryComponent } from './checkout-kitchen-history.component';

describe('CheckoutKitchenHistoryComponent', () => {
  let component: CheckoutKitchenHistoryComponent;
  let fixture: ComponentFixture<CheckoutKitchenHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CheckoutKitchenHistoryComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CheckoutKitchenHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
