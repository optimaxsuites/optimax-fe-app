import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuotationManagementComponent } from './quotation-management.component';

describe('QuotationManagementComponent', () => {
  let component: QuotationManagementComponent;
  let fixture: ComponentFixture<QuotationManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QuotationManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuotationManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
