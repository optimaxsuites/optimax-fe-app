import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyQuotationsListComponent } from './my-quotations-list.component';

describe('MyQuotationsListComponent', () => {
  let component: MyQuotationsListComponent;
  let fixture: ComponentFixture<MyQuotationsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MyQuotationsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyQuotationsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
