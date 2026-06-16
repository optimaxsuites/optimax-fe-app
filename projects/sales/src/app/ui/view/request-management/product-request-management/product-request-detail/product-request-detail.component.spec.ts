import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcurementRequestDetailComponent } from './product-request-detail.component';

describe('ProcurementRequestDetailComponent', () => {
  let component: ProcurementRequestDetailComponent;
  let fixture: ComponentFixture<ProcurementRequestDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProcurementRequestDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcurementRequestDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
