import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pro1Component } from './pro-1.component';

describe('Pro1Component', () => {
  let component: Pro1Component;
  let fixture: ComponentFixture<Pro1Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Pro1Component]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(Pro1Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
