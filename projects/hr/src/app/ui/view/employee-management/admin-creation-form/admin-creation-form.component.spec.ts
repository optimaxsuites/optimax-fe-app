import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminCreationFormComponent } from './admin-creation-form.component';

describe('AdminCreationFormComponent', () => {
  let component: AdminCreationFormComponent;
  let fixture: ComponentFixture<AdminCreationFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminCreationFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdminCreationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
