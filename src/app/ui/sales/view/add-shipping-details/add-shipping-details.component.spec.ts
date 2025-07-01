import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddShippingDetailsComponent } from './add-shipping-details.component';

describe('AddShippingDetailsComponent', () => {
  let component: AddShippingDetailsComponent;
  let fixture: ComponentFixture<AddShippingDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddShippingDetailsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddShippingDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
