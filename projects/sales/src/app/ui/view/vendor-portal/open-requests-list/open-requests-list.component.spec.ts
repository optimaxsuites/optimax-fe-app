import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenRequestsListComponent } from './open-requests-list.component';

describe('OpenRequestsListComponent', () => {
  let component: OpenRequestsListComponent;
  let fixture: ComponentFixture<OpenRequestsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OpenRequestsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpenRequestsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
