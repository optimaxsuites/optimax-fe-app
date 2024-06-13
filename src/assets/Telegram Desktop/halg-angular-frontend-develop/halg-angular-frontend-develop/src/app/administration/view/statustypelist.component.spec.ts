import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatustypelistComponent } from './statustypelist.component';

describe('StatustypelistComponent', () => {
  let component: StatustypelistComponent;
  let fixture: ComponentFixture<StatustypelistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StatustypelistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StatustypelistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
