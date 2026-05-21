import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcurementRequestListComponent } from './procurement-request-list.component';

describe('ProcurementRequestListComponent', () => {
  let component: ProcurementRequestListComponent;
  let fixture: ComponentFixture<ProcurementRequestListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProcurementRequestListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcurementRequestListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
