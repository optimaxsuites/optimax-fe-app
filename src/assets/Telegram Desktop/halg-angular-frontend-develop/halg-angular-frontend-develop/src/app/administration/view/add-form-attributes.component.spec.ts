import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddFormAttributesComponent } from './add-form-attributes.component';

describe('AddFormAttributesComponent', () => {
  let component: AddFormAttributesComponent;
  let fixture: ComponentFixture<AddFormAttributesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddFormAttributesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddFormAttributesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
