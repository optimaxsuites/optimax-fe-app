import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppraisalassessmentComponent } from './appraisalassessment.component';

describe('AppraisalassessmentComponent', () => {
  let component: AppraisalassessmentComponent;
  let fixture: ComponentFixture<AppraisalassessmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppraisalassessmentComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AppraisalassessmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
