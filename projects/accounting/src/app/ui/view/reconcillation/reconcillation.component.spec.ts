import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReconcillationComponent } from './reconcillation.component';

describe('ReconcillationComponent', () => {
  let component: ReconcillationComponent;
  let fixture: ComponentFixture<ReconcillationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReconcillationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReconcillationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
