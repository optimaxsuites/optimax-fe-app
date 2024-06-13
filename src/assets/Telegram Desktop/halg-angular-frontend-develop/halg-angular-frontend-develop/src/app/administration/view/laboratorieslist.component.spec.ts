import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LaboratorieslistComponent } from './laboratorieslist.component';

describe('LaboratorieslistComponent', () => {
  let component: LaboratorieslistComponent;
  let fixture: ComponentFixture<LaboratorieslistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LaboratorieslistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LaboratorieslistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
