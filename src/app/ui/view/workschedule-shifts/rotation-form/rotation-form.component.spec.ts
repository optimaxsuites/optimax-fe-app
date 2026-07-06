import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RotationFormComponent } from './rotation-form.component';

describe('RotationFormComponent', () => {
  let component: RotationFormComponent;
  let fixture: ComponentFixture<RotationFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RotationFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RotationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
