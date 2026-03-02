import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrApprovalInboxComponent } from './pr-approval-inbox.component';

describe('PrApprovalInboxComponent', () => {
  let component: PrApprovalInboxComponent;
  let fixture: ComponentFixture<PrApprovalInboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrApprovalInboxComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PrApprovalInboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
