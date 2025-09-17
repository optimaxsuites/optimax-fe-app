import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckoutKitchenComponent } from './checkout-kitchen.component';

describe('CheckoutKitchenComponent', () => {
  let component: CheckoutKitchenComponent;
  let fixture: ComponentFixture<CheckoutKitchenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CheckoutKitchenComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CheckoutKitchenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
