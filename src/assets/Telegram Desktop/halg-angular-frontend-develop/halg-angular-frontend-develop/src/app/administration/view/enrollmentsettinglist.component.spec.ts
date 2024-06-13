import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnrollmentsettinglistComponent } from './enrollmentsettinglist.component';

describe('EnrollmentsettinglistComponent', () => {
  let component: EnrollmentsettinglistComponent;
  let fixture: ComponentFixture<EnrollmentsettinglistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EnrollmentsettinglistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EnrollmentsettinglistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
