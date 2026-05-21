import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentGenerationComponent } from './document-generation.component';

describe('DocumentGenerationComponent', () => {
  let component: DocumentGenerationComponent;
  let fixture: ComponentFixture<DocumentGenerationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DocumentGenerationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentGenerationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
