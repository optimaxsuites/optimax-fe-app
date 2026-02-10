import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanDetailViewComponent } from './loan-detail-view.component';

describe('LoanDetailViewComponent', () => {
  let component: LoanDetailViewComponent;
  let fixture: ComponentFixture<LoanDetailViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoanDetailViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanDetailViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
