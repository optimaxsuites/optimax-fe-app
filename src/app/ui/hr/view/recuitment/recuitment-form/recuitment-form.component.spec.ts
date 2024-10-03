import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecuitmentFormComponent } from './recuitment-form.component';

describe('RecuitmentFormComponent', () => {
  let component: RecuitmentFormComponent;
  let fixture: ComponentFixture<RecuitmentFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RecuitmentFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RecuitmentFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
