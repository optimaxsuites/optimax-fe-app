import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetadatasComponent } from './metadatas.component';

describe('MetadatasComponent', () => {
  let component: MetadatasComponent;
  let fixture: ComponentFixture<MetadatasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MetadatasComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MetadatasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
