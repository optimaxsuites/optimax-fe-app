import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { GracePeriodRequestsComponent } from './grace-period-requests.component';
import { AdvanceGracePeriodService } from '../../../service/loan/loan-grace-period.service';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';

describe('GracePeriodRequestsComponent', () => {
  let component: GracePeriodRequestsComponent;
  let fixture: ComponentFixture<GracePeriodRequestsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GracePeriodRequestsComponent],
      imports: [ReactiveFormsModule],
      providers: [
        {
          provide: AdvanceGracePeriodService,
          useValue: {
            createRequest: () => of({})
          }
        },
        {
          provide: CooperativeService,
          useValue: {
            createGracePeriodRequest: () => of({})
          }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GracePeriodRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
