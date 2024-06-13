import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmsampleComponent } from './confirmsample.component';

describe('ConfirmsampleComponent', () => {
  let component: ConfirmsampleComponent;
  let fixture: ComponentFixture<ConfirmsampleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmsampleComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfirmsampleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
