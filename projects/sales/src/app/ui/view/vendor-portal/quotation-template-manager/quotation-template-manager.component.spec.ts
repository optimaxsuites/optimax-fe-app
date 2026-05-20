import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuotationTemplateManagerComponent } from './quotation-template-manager.component';

describe('QuotationTemplateManagerComponent', () => {
  let component: QuotationTemplateManagerComponent;
  let fixture: ComponentFixture<QuotationTemplateManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QuotationTemplateManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuotationTemplateManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
