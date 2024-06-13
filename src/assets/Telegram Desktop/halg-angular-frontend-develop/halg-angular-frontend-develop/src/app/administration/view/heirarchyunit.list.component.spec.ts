import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeirarchyunitListComponent } from './heirarchyunit.list.component';

describe('Heirarchyunit.ListComponent', () => {
  let component: HeirarchyunitListComponent;
  let fixture: ComponentFixture<HeirarchyunitListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HeirarchyunitListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HeirarchyunitListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
