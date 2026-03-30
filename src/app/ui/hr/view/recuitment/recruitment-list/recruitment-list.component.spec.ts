import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecruitmentListComponent } from './recruitment-list.component';

describe('RecruitmentListComponent', () => {
  let component: RecruitmentListComponent;
  let fixture: ComponentFixture<RecruitmentListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RecruitmentListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RecruitmentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
