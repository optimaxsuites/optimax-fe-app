import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovedVendorComponent } from './approved-vendor.component';

describe('ApprovedVendorComponent', () => {
  let component: ApprovedVendorComponent;
  let fixture: ComponentFixture<ApprovedVendorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ApprovedVendorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ApprovedVendorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
