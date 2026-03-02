import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComplianceDocumentUploadComponent } from './compliance-document-upload.component';

describe('ComplianceDocumentUploadComponent', () => {
  let component: ComplianceDocumentUploadComponent;
  let fixture: ComponentFixture<ComplianceDocumentUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ComplianceDocumentUploadComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ComplianceDocumentUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
