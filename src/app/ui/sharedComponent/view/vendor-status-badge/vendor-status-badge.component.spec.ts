import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorStatusBadgeComponent } from './vendor-status-badge.component';

describe('VendorStatusBadgeComponent', () => {
  let component: VendorStatusBadgeComponent;
  let fixture: ComponentFixture<VendorStatusBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VendorStatusBadgeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VendorStatusBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
