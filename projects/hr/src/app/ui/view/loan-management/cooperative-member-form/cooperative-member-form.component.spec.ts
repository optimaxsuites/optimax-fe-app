import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CooperativeMemberFormComponent } from './cooperative-member-form.component';

describe('CooperativeMemberFormComponent', () => {
  let component: CooperativeMemberFormComponent;
  let fixture: ComponentFixture<CooperativeMemberFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CooperativeMemberFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CooperativeMemberFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
