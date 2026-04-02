import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EStoreOrdersListComponent } from './estore-orders-list.component';

describe('EStoreOrdersListComponent', () => {
  let component: EStoreOrdersListComponent;
  let fixture: ComponentFixture<EStoreOrdersListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EStoreOrdersListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EStoreOrdersListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
