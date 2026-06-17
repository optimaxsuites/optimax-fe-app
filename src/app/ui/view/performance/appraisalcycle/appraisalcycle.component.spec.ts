import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppraisalcycleComponent } from './appraisalcycle.component';

describe('AppraisalcycleComponent', () => {
  let component: AppraisalcycleComponent;
  let fixture: ComponentFixture<AppraisalcycleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppraisalcycleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppraisalcycleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
