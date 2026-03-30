import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';

import { CooperativeMemberLoansComponent } from './cooperative-member-loans.component';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';

describe('CooperativeMemberLoansComponent', () => {
  let component: CooperativeMemberLoansComponent;
  let fixture: ComponentFixture<CooperativeMemberLoansComponent>;
  let cooperativeServiceSpy: jasmine.SpyObj<CooperativeService>;

  beforeEach(async () => {
    cooperativeServiceSpy = jasmine.createSpyObj('CooperativeService', [
      'getMemberById',
      'getLoansByMember',
      'formatCurrency'
    ]);

    cooperativeServiceSpy.getMemberById.and.returnValue({
      id: '1',
      memberId: 'COP-001',
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '08000000000',
      joinDate: new Date().toISOString(),
      status: 'ACTIVE',
      shareCapital: 100000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    cooperativeServiceSpy.getLoansByMember.and.returnValue([]);
    cooperativeServiceSpy.formatCurrency.and.callFake((amount: number) => `₦${amount}`);

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [CooperativeMemberLoansComponent],
      providers: [{ provide: CooperativeService, useValue: cooperativeServiceSpy }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CooperativeMemberLoansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
