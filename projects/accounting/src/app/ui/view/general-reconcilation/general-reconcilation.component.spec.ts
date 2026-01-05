import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneralReconcilationComponent } from './general-reconcilation.component';

describe('GeneralReconcilationComponent', () => {
  let component: GeneralReconcilationComponent;
  let fixture: ComponentFixture<GeneralReconcilationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GeneralReconcilationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GeneralReconcilationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
