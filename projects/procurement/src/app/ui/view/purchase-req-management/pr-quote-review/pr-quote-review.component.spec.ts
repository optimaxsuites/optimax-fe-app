import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrQuoteReviewComponent } from './pr-quote-review.component';

describe('PrQuoteReviewComponent', () => {
  let component: PrQuoteReviewComponent;
  let fixture: ComponentFixture<PrQuoteReviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrQuoteReviewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PrQuoteReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
