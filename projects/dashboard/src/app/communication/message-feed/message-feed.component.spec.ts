import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageFeedComponent } from './message-feed.component';

describe('MessageFeedComponent', () => {
  let component: MessageFeedComponent;
  let fixture: ComponentFixture<MessageFeedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MessageFeedComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MessageFeedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
