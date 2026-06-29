import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestDraftsComponent } from './request-drafts.component';

describe('RequestDraftsComponent', () => {
  let component: RequestDraftsComponent;
  let fixture: ComponentFixture<RequestDraftsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RequestDraftsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestDraftsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
