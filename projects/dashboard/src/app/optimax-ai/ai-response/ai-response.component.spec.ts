import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiResponseComponent } from './ai-response.component';

describe('AiResponseComponent', () => {
  let component: AiResponseComponent;
  let fixture: ComponentFixture<AiResponseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AiResponseComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AiResponseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
