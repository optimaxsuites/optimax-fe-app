import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestReorderComponent } from './request-reorder.component';

describe('RequestReorderComponent', () => {
  let component: RequestReorderComponent;
  let fixture: ComponentFixture<RequestReorderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RequestReorderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestReorderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
