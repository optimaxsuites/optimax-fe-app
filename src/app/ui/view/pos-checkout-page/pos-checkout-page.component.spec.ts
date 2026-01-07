import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosCheckoutPageComponent } from './pos-checkout-page.component';

describe('PosCheckoutPageComponent', () => {
  let component: PosCheckoutPageComponent;
  let fixture: ComponentFixture<PosCheckoutPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PosCheckoutPageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PosCheckoutPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
