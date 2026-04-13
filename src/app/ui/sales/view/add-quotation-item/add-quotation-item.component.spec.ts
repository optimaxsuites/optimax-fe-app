import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddQuotationItemComponent } from './add-quotation-item.component';

describe('AddQuotationItemComponent', () => {
  let component: AddQuotationItemComponent;
  let fixture: ComponentFixture<AddQuotationItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddQuotationItemComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddQuotationItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
