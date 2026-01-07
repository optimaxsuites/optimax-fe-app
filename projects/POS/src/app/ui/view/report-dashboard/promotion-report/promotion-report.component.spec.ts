import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PromotionReportComponent } from './promotion-report.component';

describe('PromotionReportComponent', () => {
  let component: PromotionReportComponent;
  let fixture: ComponentFixture<PromotionReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PromotionReportComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PromotionReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
