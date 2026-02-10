import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LateArrivalsComponent } from './late-arrivals.component';

describe('LateArrivalsComponent', () => {
  let component: LateArrivalsComponent;
  let fixture: ComponentFixture<LateArrivalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LateArrivalsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LateArrivalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
