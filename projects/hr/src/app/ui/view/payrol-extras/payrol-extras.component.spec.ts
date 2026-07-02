import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayrolExtrasComponent } from './payrol-extras.component';

describe('PayrolExtrasComponent', () => {
  let component: PayrolExtrasComponent;
  let fixture: ComponentFixture<PayrolExtrasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PayrolExtrasComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PayrolExtrasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
