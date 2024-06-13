import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiagnonisconditionlistComponent } from './diagnonisconditionlist.component';

describe('DiagnonisconditionlistComponent', () => {
  let component: DiagnonisconditionlistComponent;
  let fixture: ComponentFixture<DiagnonisconditionlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DiagnonisconditionlistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DiagnonisconditionlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
