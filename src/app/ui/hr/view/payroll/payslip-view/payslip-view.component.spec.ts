import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayslipViewComponent } from './payslip-view.component';

describe('PayslipViewComponent', () => {
  let component: PayslipViewComponent;
  let fixture: ComponentFixture<PayslipViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PayslipViewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PayslipViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
