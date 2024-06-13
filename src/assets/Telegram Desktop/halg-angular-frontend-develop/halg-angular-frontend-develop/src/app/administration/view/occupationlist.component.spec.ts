import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OccupationlistComponent } from './occupationlist.component';

describe('OccupationlistComponent', () => {
  let component: OccupationlistComponent;
  let fixture: ComponentFixture<OccupationlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OccupationlistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OccupationlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
