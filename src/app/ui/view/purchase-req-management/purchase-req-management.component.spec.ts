import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseReqManagementComponent } from './purchase-req-management.component';

describe('PurchaseReqManagementComponent', () => {
  let component: PurchaseReqManagementComponent;
  let fixture: ComponentFixture<PurchaseReqManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PurchaseReqManagementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PurchaseReqManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
