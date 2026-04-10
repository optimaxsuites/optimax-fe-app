import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppraisallistComponent } from './appraisallist.component';

describe('AppraisallistComponent', () => {
  let component: AppraisallistComponent;
  let fixture: ComponentFixture<AppraisallistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppraisallistComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppraisallistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
