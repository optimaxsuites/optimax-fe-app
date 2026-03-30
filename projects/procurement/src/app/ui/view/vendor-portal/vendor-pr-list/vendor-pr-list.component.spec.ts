import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorPrListComponent } from './vendor-pr-list.component';

describe('VendorPrListComponent', () => {
  let component: VendorPrListComponent;
  let fixture: ComponentFixture<VendorPrListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VendorPrListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VendorPrListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
