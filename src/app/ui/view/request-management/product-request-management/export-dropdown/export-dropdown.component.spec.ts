import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExportDropdownComponent } from './export-dropdown.component';

describe('ExportDropdownComponent', () => {
  let component: ExportDropdownComponent;
  let fixture: ComponentFixture<ExportDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ExportDropdownComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExportDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
