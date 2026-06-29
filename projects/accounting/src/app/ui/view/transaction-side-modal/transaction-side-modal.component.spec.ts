import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionSideModalComponent } from './transaction-side-modal.component';

describe('TransactionSideModalComponent', () => {
  let component: TransactionSideModalComponent;
  let fixture: ComponentFixture<TransactionSideModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TransactionSideModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TransactionSideModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
