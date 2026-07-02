import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TargetformComponent } from './targetform.component';

describe('TargetformComponent', () => {
  let component: TargetformComponent;
  let fixture: ComponentFixture<TargetformComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TargetformComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TargetformComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
