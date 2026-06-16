import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CooperativeLoanApplicationComponent } from './cooperative-loan-application.component';

describe('CooperativeLoanApplicationComponent', () => {
  let component: CooperativeLoanApplicationComponent;
  let fixture: ComponentFixture<CooperativeLoanApplicationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CooperativeLoanApplicationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CooperativeLoanApplicationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
