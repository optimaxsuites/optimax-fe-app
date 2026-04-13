import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllPaymentsModalComponent } from './all-payments-modal.component';

describe('AllPaymentsModalComponent', () => {
  let component: AllPaymentsModalComponent;
  let fixture: ComponentFixture<AllPaymentsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AllPaymentsModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AllPaymentsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
