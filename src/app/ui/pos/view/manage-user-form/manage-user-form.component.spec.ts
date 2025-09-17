import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageUserFormComponent } from './manage-user-form.component';

describe('ManageUserFormComponent', () => {
  let component: ManageUserFormComponent;
  let fixture: ComponentFixture<ManageUserFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ManageUserFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ManageUserFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
