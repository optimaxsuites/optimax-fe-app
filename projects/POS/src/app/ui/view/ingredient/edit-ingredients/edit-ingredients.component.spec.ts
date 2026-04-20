import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditIngredientsComponent } from './edit-ingredients.component';

describe('EditIngredientsComponent', () => {
  let component: EditIngredientsComponent;
  let fixture: ComponentFixture<EditIngredientsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditIngredientsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditIngredientsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
