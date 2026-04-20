import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { CooperativeLoanApprovalUiComponent } from './cooperative-loan-approval-ui.component';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';

describe('CooperativeLoanApprovalUiComponent', () => {
  let component: CooperativeLoanApprovalUiComponent;
  let fixture: ComponentFixture<CooperativeLoanApprovalUiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CooperativeLoanApprovalUiComponent],
      providers: [
        {
          provide: CooperativeService,
          useValue: {
            loadGroups: () => of([]),
            getMembers: () => of([]),
            getLoans: () => of([]),
            approveLoanWithTerms: () => of(undefined),
            rejectLoan: () => of(undefined)
          }
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => 'test-uuid'
              }
            }
          }
        },
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate')
          }
        },
        {
          provide: Location,
          useValue: {
            back: jasmine.createSpy('back')
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CooperativeLoanApprovalUiComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
