import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorQuoteListComponent } from './vendor-quote-list.component';

describe('VendorQuoteListComponent', () => {
  let component: VendorQuoteListComponent;
  let fixture: ComponentFixture<VendorQuoteListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VendorQuoteListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VendorQuoteListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
