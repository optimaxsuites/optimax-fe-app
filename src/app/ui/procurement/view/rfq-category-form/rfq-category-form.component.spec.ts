import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RfqCategoryFormComponent } from './rfq-category-form.component';

describe('RfqCategoryFormComponent', () => {
  let component: RfqCategoryFormComponent;
  let fixture: ComponentFixture<RfqCategoryFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RfqCategoryFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RfqCategoryFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
