import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanReportsComponent } from './loan-reports.component';

describe('LoanReportsComponent', () => {
  let component: LoanReportsComponent;
  let fixture: ComponentFixture<LoanReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoanReportsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
