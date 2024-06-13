import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeirarchylistComponent } from './heirarchylist.component';

describe('HeirarchylistComponent', () => {
  let component: HeirarchylistComponent;
  let fixture: ComponentFixture<HeirarchylistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HeirarchylistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HeirarchylistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
