import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomsheroComponent } from './roomshero.component';

describe('RoomsheroComponent', () => {
  let component: RoomsheroComponent;
  let fixture: ComponentFixture<RoomsheroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RoomsheroComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RoomsheroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
