import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminCorrectionsComponent } from './admin-corrections.component';

describe('AdminCorrectionsComponent', () => {
  let component: AdminCorrectionsComponent;
  let fixture: ComponentFixture<AdminCorrectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminCorrectionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminCorrectionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
