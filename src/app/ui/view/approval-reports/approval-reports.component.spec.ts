import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovalReportsComponent } from './approval-reports.component';

describe('ApprovalReportsComponent', () => {
  let component: ApprovalReportsComponent;
  let fixture: ComponentFixture<ApprovalReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ApprovalReportsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ApprovalReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
