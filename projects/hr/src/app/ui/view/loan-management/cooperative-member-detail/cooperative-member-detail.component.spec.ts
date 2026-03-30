import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CooperativeMemberDetailComponent } from './cooperative-member-detail.component';

describe('CooperativeMemberDetailComponent', () => {
  let component: CooperativeMemberDetailComponent;
  let fixture: ComponentFixture<CooperativeMemberDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CooperativeMemberDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CooperativeMemberDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
