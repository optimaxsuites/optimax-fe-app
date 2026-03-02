import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrCreateComponent } from './pr-create.component';

describe('PrCreateComponent', () => {
  let component: PrCreateComponent;
  let fixture: ComponentFixture<PrCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrCreateComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PrCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
