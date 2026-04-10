import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesReconciliationComponent } from './sales-reconciliation.component';

describe('SalesReconcilationComponent', () => {
  let component: SalesReconciliationComponent;
  let fixture: ComponentFixture<SalesReconciliationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SalesReconciliationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SalesReconciliationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
