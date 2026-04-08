import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CooperativeLoansComponent } from './cooperative-loans.component';

describe('CooperativeLoansComponent', () => {
  let component: CooperativeLoansComponent;
  let fixture: ComponentFixture<CooperativeLoansComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CooperativeLoansComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CooperativeLoansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
