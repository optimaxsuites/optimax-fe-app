import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncomeStatementChartsComponent } from './income-statement-charts.component';

describe('IncomeStatementChartsComponent', () => {
  let component: IncomeStatementChartsComponent;
  let fixture: ComponentFixture<IncomeStatementChartsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IncomeStatementChartsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(IncomeStatementChartsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
