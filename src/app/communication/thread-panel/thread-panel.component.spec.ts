import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreadPanelComponent } from './thread-panel.component';

describe('ThreadPanelComponent', () => {
  let component: ThreadPanelComponent;
  let fixture: ComponentFixture<ThreadPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ThreadPanelComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ThreadPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
