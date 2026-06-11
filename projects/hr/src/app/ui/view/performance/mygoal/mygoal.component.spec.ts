import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MygoalComponent } from './mygoal.component';

describe('MygoalComponent', () => {
  let component: MygoalComponent;
  let fixture: ComponentFixture<MygoalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MygoalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MygoalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
