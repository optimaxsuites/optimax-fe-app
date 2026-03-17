import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankReconciliationComponent } from './bank-reconciliation.component';

describe('BankReconciliationComponent', () => {
  let component: BankReconciliationComponent;
  let fixture: ComponentFixture<BankReconciliationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BankReconciliationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BankReconciliationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
