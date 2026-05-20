import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcurementRequestFormComponent } from './procurement-request-form.component';

describe('ProcurementRequestFormComponent', () => {
  let component: ProcurementRequestFormComponent;
  let fixture: ComponentFixture<ProcurementRequestFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProcurementRequestFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcurementRequestFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
