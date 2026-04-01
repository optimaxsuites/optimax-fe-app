import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BudgetingForecastingComponent } from './budgeting-forecasting.component';

describe('BudgetingForecastingComponent', () => {
  let component: BudgetingForecastingComponent;
  let fixture: ComponentFixture<BudgetingForecastingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BudgetingForecastingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BudgetingForecastingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
