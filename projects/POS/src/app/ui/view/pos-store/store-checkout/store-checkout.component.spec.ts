import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StoreCheckoutComponent } from './store-checkout.component';

describe('StoreCheckoutComponent', () => {
  let component: StoreCheckoutComponent;
  let fixture: ComponentFixture<StoreCheckoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StoreCheckoutComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StoreCheckoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
