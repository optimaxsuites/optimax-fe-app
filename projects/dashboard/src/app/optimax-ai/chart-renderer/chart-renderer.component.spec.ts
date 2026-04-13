import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatRendererComponent } from './chart-renderer.component';

describe('ChatRendererComponent', () => {
  let component: ChatRendererComponent;
  let fixture: ComponentFixture<ChatRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChatRendererComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
