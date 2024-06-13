import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PharmacieslistComponent } from './pharmacieslist.component';

describe('PharmacieslistComponent', () => {
  let component: PharmacieslistComponent;
  let fixture: ComponentFixture<PharmacieslistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PharmacieslistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PharmacieslistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
