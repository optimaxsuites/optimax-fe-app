import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountReceivableManagementComponent } from './account-receivable-management.component';

describe('AccountReceivableManagementComponent', () => {
  let component: AccountReceivableManagementComponent;
  let fixture: ComponentFixture<AccountReceivableManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountReceivableManagementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AccountReceivableManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
