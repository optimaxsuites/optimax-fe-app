import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DispatchNoteComponent } from './dispatch-note.component';

describe('DispatchNoteComponent', () => {
  let component: DispatchNoteComponent;
  let fixture: ComponentFixture<DispatchNoteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DispatchNoteComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DispatchNoteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
