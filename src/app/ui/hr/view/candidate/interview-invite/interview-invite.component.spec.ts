import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterviewInviteComponent } from './interview-invite.component';

describe('InterviewInviteComponent', () => {
  let component: InterviewInviteComponent;
  let fixture: ComponentFixture<InterviewInviteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InterviewInviteComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InterviewInviteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
