import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorRatingComponent } from './vendor-rating.component';

describe('VendorRatingComponent', () => {
  let component: VendorRatingComponent;
  let fixture: ComponentFixture<VendorRatingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VendorRatingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorRatingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
