import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorCreationModalComponent } from './vendor-creation-modal.component';

describe('VendorCreationModalComponent', () => {
  let component: VendorCreationModalComponent;
  let fixture: ComponentFixture<VendorCreationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VendorCreationModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VendorCreationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
