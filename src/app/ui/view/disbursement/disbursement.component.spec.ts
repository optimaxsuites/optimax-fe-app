import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisbursementComponent } from './disbursement.component';

describe('DisbursementComponent', () => {
  let component: DisbursementComponent;
  let fixture: ComponentFixture<DisbursementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DisbursementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DisbursementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
