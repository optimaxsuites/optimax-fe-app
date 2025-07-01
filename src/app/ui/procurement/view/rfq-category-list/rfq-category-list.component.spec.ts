import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RfqCategoryListComponent } from './rfq-category-list.component';

describe('RfqCategoryListComponent', () => {
  let component: RfqCategoryListComponent;
  let fixture: ComponentFixture<RfqCategoryListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RfqCategoryListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RfqCategoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
