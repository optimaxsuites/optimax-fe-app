import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceRequestCancellationDialogComponent } from './service-request-cancellation-dialog.component';

describe('ServiceRequestCancellationDialogComponent', () => {
  let component: ServiceRequestCancellationDialogComponent;
  let fixture: ComponentFixture<ServiceRequestCancellationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ServiceRequestCancellationDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceRequestCancellationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
