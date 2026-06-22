import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesOrdersDetailComponent } from './sales-orders-detail.component';

describe('SalesOrdersDetailComponent', () => {
  let component: SalesOrdersDetailComponent;
  let fixture: ComponentFixture<SalesOrdersDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SalesOrdersDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesOrdersDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
