import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LevelofadherenceComponent } from './levelofadherence.component';

describe('LevelofadherenceComponent', () => {
  let component: LevelofadherenceComponent;
  let fixture: ComponentFixture<LevelofadherenceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LevelofadherenceComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LevelofadherenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
