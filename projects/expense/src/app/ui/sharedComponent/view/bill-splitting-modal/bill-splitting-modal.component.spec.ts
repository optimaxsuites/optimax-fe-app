import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BillSplittingModalComponent } from './bill-splitting-modal.component';

describe('BillSplittingModalComponent', () => {
  let component: BillSplittingModalComponent;
  let fixture: ComponentFixture<BillSplittingModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BillSplittingModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BillSplittingModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
