import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddHeirarchyComponent } from './add-heirarchy.component';

describe('AddHeirarchyComponent', () => {
  let component: AddHeirarchyComponent;
  let fixture: ComponentFixture<AddHeirarchyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddHeirarchyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddHeirarchyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
