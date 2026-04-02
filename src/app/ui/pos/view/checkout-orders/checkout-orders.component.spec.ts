import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckoutOrdersComponent } from './checkout-orders.component';

describe('CheckoutOrdersComponent', () => {
  let component: CheckoutOrdersComponent;
  let fixture: ComponentFixture<CheckoutOrdersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CheckoutOrdersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CheckoutOrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
