import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShiftSummaryComponent } from './shift-summary.component';

describe('ShiftSummaryComponent', () => {
  let component: ShiftSummaryComponent;
  let fixture: ComponentFixture<ShiftSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ShiftSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShiftSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
