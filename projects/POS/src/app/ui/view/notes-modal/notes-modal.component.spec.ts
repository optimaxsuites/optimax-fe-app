import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotesModalComponent } from './notes-modal.component';

describe('NotesModalComponent', () => {
  let component: NotesModalComponent;
  let fixture: ComponentFixture<NotesModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NotesModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NotesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
