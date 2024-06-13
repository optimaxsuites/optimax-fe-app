import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorCategoryCreationModalComponent } from './vendor-category-creation-modal.component';

describe('VendorCategoryCreationModalComponent', () => {
  let component: VendorCategoryCreationModalComponent;
  let fixture: ComponentFixture<VendorCategoryCreationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VendorCategoryCreationModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VendorCategoryCreationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
