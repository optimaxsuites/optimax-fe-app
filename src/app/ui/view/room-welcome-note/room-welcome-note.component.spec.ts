import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomWelcomeNoteComponent } from './room-welcome-note.component';

describe('RoomWelcomeNoteComponent', () => {
  let component: RoomWelcomeNoteComponent;
  let fixture: ComponentFixture<RoomWelcomeNoteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RoomWelcomeNoteComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RoomWelcomeNoteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
