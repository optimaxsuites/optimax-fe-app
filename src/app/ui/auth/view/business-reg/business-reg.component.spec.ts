import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusinessRegComponent } from './business-reg.component';

describe('BusinessRegComponent', () => {
  let component: BusinessRegComponent;
  let fixture: ComponentFixture<BusinessRegComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BusinessRegComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BusinessRegComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
