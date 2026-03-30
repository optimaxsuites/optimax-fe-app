import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CooperativeLoanDetailComponent } from './cooperative-loan-detail.component';

describe('CooperativeLoanDetailComponent', () => {
  let component: CooperativeLoanDetailComponent;
  let fixture: ComponentFixture<CooperativeLoanDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CooperativeLoanDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CooperativeLoanDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
