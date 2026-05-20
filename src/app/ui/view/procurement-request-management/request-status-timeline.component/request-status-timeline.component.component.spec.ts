import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestStatusTimelineComponentComponent } from './request-status-timeline.component.component';

describe('RequestStatusTimelineComponentComponent', () => {
  let component: RequestStatusTimelineComponentComponent;
  let fixture: ComponentFixture<RequestStatusTimelineComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RequestStatusTimelineComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestStatusTimelineComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
