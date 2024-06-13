import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LaboaratoryPortalListComponent } from './laboaratory-portal-list.component';

describe('LaboaratoryPortalListComponent', () => {
  let component: LaboaratoryPortalListComponent;
  let fixture: ComponentFixture<LaboaratoryPortalListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LaboaratoryPortalListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LaboaratoryPortalListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
