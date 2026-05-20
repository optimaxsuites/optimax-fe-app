import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiQuotationAnalysisComponent } from './ai-quotation-analysis.component';

describe('AiQuotationAnalysisComponent', () => {
  let component: AiQuotationAnalysisComponent;
  let fixture: ComponentFixture<AiQuotationAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AiQuotationAnalysisComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiQuotationAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
