import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LaundryServiceComponent } from './laundry-service.component';

describe('LaundryServiceComponent', () => {
  let component: LaundryServiceComponent;
  let fixture: ComponentFixture<LaundryServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LaundryServiceComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LaundryServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
