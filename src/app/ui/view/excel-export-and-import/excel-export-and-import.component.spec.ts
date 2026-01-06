import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExcelExportAndImportComponent } from './excel-export-and-import.component';

describe('ExcelExportAndImportComponent', () => {
  let component: ExcelExportAndImportComponent;
  let fixture: ComponentFixture<ExcelExportAndImportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ExcelExportAndImportComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExcelExportAndImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
