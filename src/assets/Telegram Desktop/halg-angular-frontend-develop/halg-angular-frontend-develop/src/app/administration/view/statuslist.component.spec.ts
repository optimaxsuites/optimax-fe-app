import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatuslistComponent } from './statuslist.component';

describe('StatuslistComponent', () => {
  let component: StatuslistComponent;
  let fixture: ComponentFixture<StatuslistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StatuslistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StatuslistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
