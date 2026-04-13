import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OptimaxAiComponent } from './optimax-ai.component';

describe('OptimaxAiComponent', () => {
  let component: OptimaxAiComponent;
  let fixture: ComponentFixture<OptimaxAiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OptimaxAiComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OptimaxAiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
