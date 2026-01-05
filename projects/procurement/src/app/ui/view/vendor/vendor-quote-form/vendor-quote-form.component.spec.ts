import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorQuoteFormComponent } from './vendor-quote-form.component';

describe('VendorQuoteFormComponent', () => {
  let component: VendorQuoteFormComponent;
  let fixture: ComponentFixture<VendorQuoteFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VendorQuoteFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VendorQuoteFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
