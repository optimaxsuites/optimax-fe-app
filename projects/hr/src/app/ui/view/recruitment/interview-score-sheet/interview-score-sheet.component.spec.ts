import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterviewScoreSheetComponent } from './interview-score-sheet.component';

describe('InterviewScoreSheetComponent', () => {
  let component: InterviewScoreSheetComponent;
  let fixture: ComponentFixture<InterviewScoreSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InterviewScoreSheetComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InterviewScoreSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
