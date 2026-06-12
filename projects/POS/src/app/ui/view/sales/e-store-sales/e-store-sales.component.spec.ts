import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EStoreSalesComponent } from './e-store-sales.component';

describe('EStoreSalesComponent', () => {
  let component: EStoreSalesComponent;
  let fixture: ComponentFixture<EStoreSalesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EStoreSalesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EStoreSalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
