import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestEditFormComponent } from './request-edit-form.component';

describe('RequestEditFormComponent', () => {
  let component: RequestEditFormComponent;
  let fixture: ComponentFixture<RequestEditFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RequestEditFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestEditFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
