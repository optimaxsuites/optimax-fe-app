import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenderlistComponent } from './genderlist.component';

describe('GenderlistComponent', () => {
  let component: GenderlistComponent;
  let fixture: ComponentFixture<GenderlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GenderlistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GenderlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
