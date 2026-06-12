import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomfooterComponent } from './roomfooter.component';

describe('RoomfooterComponent', () => {
  let component: RoomfooterComponent;
  let fixture: ComponentFixture<RoomfooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RoomfooterComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RoomfooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
