import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerificationFailedComponent } from './verification-failed.component';

describe('VerificationFailedComponent', () => {
  let component: VerificationFailedComponent;
  let fixture: ComponentFixture<VerificationFailedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VerificationFailedComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VerificationFailedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
