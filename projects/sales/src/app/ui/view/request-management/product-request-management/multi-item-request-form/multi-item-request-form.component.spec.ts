import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiItemRequestFormComponent } from './multi-item-request-form.component';

describe('MultiItemRequestFormComponent', () => {
  let component: MultiItemRequestFormComponent;
  let fixture: ComponentFixture<MultiItemRequestFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MultiItemRequestFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultiItemRequestFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
