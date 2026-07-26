import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorContractsComponent } from './vendor-contracts.component';

describe('VendorContractsComponent', () => {
  let component: VendorContractsComponent;
  let fixture: ComponentFixture<VendorContractsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VendorContractsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorContractsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
