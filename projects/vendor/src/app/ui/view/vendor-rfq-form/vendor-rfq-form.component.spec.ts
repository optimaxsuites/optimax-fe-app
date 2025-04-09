import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorRfqFormComponent } from './vendor-rfq-form.component';

describe('VendorRfqFormComponent', () => {
  let component: VendorRfqFormComponent;
  let fixture: ComponentFixture<VendorRfqFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VendorRfqFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VendorRfqFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
