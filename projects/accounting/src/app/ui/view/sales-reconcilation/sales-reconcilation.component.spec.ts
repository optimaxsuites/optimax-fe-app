import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesReconcilationComponent } from './sales-reconcilation.component';

describe('SalesReconcilationComponent', () => {
  let component: SalesReconcilationComponent;
  let fixture: ComponentFixture<SalesReconcilationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SalesReconcilationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SalesReconcilationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
