import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NationalitylistComponent } from './nationalitylist.component';

describe('NationalitylistComponent', () => {
  let component: NationalitylistComponent;
  let fixture: ComponentFixture<NationalitylistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NationalitylistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NationalitylistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
