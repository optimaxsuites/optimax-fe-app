import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PharmacyARVRefillComponent } from './pharmacy-arvrefill.component';

describe('PharmacyARVRefillComponent', () => {
  let component: PharmacyARVRefillComponent;
  let fixture: ComponentFixture<PharmacyARVRefillComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PharmacyARVRefillComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PharmacyARVRefillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
