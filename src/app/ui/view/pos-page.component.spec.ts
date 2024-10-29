import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosPageComponent } from './pos-page.component';

describe('PosPageComponent', () => {
  let component: PosPageComponent;
  let fixture: ComponentFixture<PosPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PosPageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PosPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
