import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomdesignComponent } from './roomdesign.component';

describe('RoomdesignComponent', () => {
  let component: RoomdesignComponent;
  let fixture: ComponentFixture<RoomdesignComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RoomdesignComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RoomdesignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
