import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JopOpeningsComponent } from './jop.openings.component';

describe('JopOpeningsComponent', () => {
  let component: JopOpeningsComponent;
  let fixture: ComponentFixture<JopOpeningsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [JopOpeningsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(JopOpeningsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
