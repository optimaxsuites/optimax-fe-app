import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JoinCooperativeGroupComponent } from './join-cooperative-group.component';

describe('JoinCooperativeGroupComponent', () => {
  let component: JoinCooperativeGroupComponent;
  let fixture: ComponentFixture<JoinCooperativeGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [JoinCooperativeGroupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JoinCooperativeGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
