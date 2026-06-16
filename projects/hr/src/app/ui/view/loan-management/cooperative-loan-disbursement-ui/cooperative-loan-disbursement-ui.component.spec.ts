import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CooperativeLoanDisbursementUiComponent } from './cooperative-loan-disbursement-ui.component';

describe('CooperativeLoanDisbursementUiComponent', () => {
  let component: CooperativeLoanDisbursementUiComponent;
  let fixture: ComponentFixture<CooperativeLoanDisbursementUiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CooperativeLoanDisbursementUiComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CooperativeLoanDisbursementUiComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});