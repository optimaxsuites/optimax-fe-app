import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorProfileFormComponent } from './vendor-profile-form.component';

describe('VendorProfileFormComponent', () => {
  let component: VendorProfileFormComponent;
  let fixture: ComponentFixture<VendorProfileFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VendorProfileFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VendorProfileFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
