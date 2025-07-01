import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewCoaModalComponent } from './new-coa-modal.component';

describe('NewCoaModalComponent', () => {
  let component: NewCoaModalComponent;
  let fixture: ComponentFixture<NewCoaModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NewCoaModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NewCoaModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
