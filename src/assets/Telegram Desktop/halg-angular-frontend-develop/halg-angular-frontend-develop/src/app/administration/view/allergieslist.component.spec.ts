import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllergieslistComponent } from './allergieslist.component';

describe('AllergieslistComponent', () => {
  let component: AllergieslistComponent;
  let fixture: ComponentFixture<AllergieslistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AllergieslistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AllergieslistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
