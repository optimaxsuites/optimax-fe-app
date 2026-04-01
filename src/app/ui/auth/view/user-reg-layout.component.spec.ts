import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserRegLayoutComponent } from './user-reg-layout.component';

describe('UserRegLayoutComponent', () => {
  let component: UserRegLayoutComponent;
  let fixture: ComponentFixture<UserRegLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserRegLayoutComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UserRegLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
