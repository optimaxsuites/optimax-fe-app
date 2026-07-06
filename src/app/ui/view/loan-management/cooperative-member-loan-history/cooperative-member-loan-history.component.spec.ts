import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CooperativeMemberLoanHistoryComponent } from './cooperative-member-loan-history.component';

describe('CooperativeMemberLoanHistoryComponent', () => {
  let component: CooperativeMemberLoanHistoryComponent;
  let fixture: ComponentFixture<CooperativeMemberLoanHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CooperativeMemberLoanHistoryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CooperativeMemberLoanHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
