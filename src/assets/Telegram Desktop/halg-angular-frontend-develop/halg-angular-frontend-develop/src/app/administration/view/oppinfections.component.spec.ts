import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OppinfectionsComponent } from './oppinfections.component';

describe('OppinfectionsComponent', () => {
  let component: OppinfectionsComponent;
  let fixture: ComponentFixture<OppinfectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OppinfectionsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OppinfectionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
