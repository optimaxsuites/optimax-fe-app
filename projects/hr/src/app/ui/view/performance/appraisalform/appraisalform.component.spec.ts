import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppraisalformComponent } from './appraisalform.component';

describe('AppraisalformComponent', () => {
  let component: AppraisalformComponent;
  let fixture: ComponentFixture<AppraisalformComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppraisalformComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppraisalformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
