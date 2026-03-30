import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyProjectDetailComponent } from './my-project-detail.component';

describe('MyProjectDetailComponent', () => {
  let component: MyProjectDetailComponent;
  let fixture: ComponentFixture<MyProjectDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MyProjectDetailComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MyProjectDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
