import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RejectedVendorComponent } from './rejected-vendor.component';

describe('RejectedVendorComponent', () => {
  let component: RejectedVendorComponent;
  let fixture: ComponentFixture<RejectedVendorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RejectedVendorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RejectedVendorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
