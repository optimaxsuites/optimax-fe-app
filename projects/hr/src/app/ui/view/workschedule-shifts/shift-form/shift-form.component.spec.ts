import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShiftFormComponent } from './shift-form.component';

describe('ShiftFormComponent', () => {
  let component: ShiftFormComponent;
  let fixture: ComponentFixture<ShiftFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ShiftFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShiftFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
