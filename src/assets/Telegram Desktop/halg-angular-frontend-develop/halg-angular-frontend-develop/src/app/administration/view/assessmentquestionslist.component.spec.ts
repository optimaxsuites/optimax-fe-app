import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssessmentquestionslistComponent } from './assessmentquestionslist.component';

describe('AssessmentquestionslistComponent', () => {
  let component: AssessmentquestionslistComponent;
  let fixture: ComponentFixture<AssessmentquestionslistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssessmentquestionslistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssessmentquestionslistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
