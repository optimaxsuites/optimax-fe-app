import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProformaInvoiceModalComponent } from './proforma-invoice-modal.component';

describe('ProformaInvoiceModalComponent', () => {
  let component: ProformaInvoiceModalComponent;
  let fixture: ComponentFixture<ProformaInvoiceModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProformaInvoiceModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProformaInvoiceModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
