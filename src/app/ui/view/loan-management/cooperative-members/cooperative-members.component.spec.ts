import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CooperativeMembersComponent } from './cooperative-members.component';

describe('CooperativeMembersComponent', () => {
  let component: CooperativeMembersComponent;
  let fixture: ComponentFixture<CooperativeMembersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CooperativeMembersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CooperativeMembersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
