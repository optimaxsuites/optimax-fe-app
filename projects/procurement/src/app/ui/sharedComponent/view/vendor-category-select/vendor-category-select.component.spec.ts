import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorCategorySelectComponent } from './vendor-category-select.component';

describe('VendorCategorySelectComponent', () => {
  let component: VendorCategorySelectComponent;
  let fixture: ComponentFixture<VendorCategorySelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VendorCategorySelectComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VendorCategorySelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
