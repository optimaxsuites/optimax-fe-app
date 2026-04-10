import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneralReconciliationComponent } from './general-reconciliation.component';

describe('GeneralReconcilationComponent', () => {
  let component: GeneralReconciliationComponent;
  let fixture: ComponentFixture<GeneralReconciliationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GeneralReconciliationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GeneralReconciliationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
