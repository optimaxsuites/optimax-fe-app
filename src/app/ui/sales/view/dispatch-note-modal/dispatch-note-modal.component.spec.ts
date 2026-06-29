import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DispatchNoteModalComponent } from './dispatch-note-modal.component';

describe('DispatchNoteModalComponent', () => {
  let component: DispatchNoteModalComponent;
  let fixture: ComponentFixture<DispatchNoteModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DispatchNoteModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DispatchNoteModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
