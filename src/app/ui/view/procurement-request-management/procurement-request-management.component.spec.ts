import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcurementRequestManagementComponent } from './procurement-request-management.component';

describe('ProcurementRequestManagementComponent', () => {
  let component: ProcurementRequestManagementComponent;
  let fixture: ComponentFixture<ProcurementRequestManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProcurementRequestManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcurementRequestManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
