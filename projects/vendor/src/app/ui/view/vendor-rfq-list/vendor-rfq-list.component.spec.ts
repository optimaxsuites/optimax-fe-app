import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorRfqListComponent } from './vendor-rfq-list.component';

describe('VendorRfqListComponent', () => {
  let component: VendorRfqListComponent;
  let fixture: ComponentFixture<VendorRfqListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VendorRfqListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VendorRfqListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
