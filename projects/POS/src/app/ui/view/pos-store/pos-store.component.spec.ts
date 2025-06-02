import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosStoreComponent } from './pos-store.component';

describe('PosStoreComponent', () => {
  let component: PosStoreComponent;
  let fixture: ComponentFixture<PosStoreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PosStoreComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PosStoreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
