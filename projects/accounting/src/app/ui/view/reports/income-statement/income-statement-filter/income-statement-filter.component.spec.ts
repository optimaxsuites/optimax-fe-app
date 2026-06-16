import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncomeStatementFilterComponent } from './income-statement-filter.component';

describe('IncomeStatementFilterComponent', () => {
  let component: IncomeStatementFilterComponent;
  let fixture: ComponentFixture<IncomeStatementFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IncomeStatementFilterComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(IncomeStatementFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
