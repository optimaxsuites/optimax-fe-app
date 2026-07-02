import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaykeysComponent } from './paykeys.component';

describe('PaykeysComponent', () => {
  let component: PaykeysComponent;
  let fixture: ComponentFixture<PaykeysComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PaykeysComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PaykeysComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
