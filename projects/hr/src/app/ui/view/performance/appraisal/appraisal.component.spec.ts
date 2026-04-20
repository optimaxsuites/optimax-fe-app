import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppraisalComponent } from './appraisal.component';

describe('AppraisalComponent', () => {
  let component: AppraisalComponent;
  let fixture: ComponentFixture<AppraisalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppraisalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppraisalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
