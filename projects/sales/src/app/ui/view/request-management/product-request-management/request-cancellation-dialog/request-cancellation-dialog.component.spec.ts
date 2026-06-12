import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestCancellationDialogComponent } from './request-cancellation-dialog.component';

describe('RequestCancellationDialogComponent', () => {
  let component: RequestCancellationDialogComponent;
  let fixture: ComponentFixture<RequestCancellationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RequestCancellationDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestCancellationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
