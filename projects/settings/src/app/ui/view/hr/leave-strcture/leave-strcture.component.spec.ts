import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeaveStrctureComponent } from './leave-strcture.component';

describe('LeaveStrctureComponent', () => {
  let component: LeaveStrctureComponent;
  let fixture: ComponentFixture<LeaveStrctureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LeaveStrctureComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LeaveStrctureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
