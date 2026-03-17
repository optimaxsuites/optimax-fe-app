import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseFormsModalComponent } from './expense-forms-modal.component';

describe('ExpenseFormsModalComponent', () => {
  let component: ExpenseFormsModalComponent;
  let fixture: ComponentFixture<ExpenseFormsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ExpenseFormsModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExpenseFormsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
