import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerificationSuccessfullComponent } from './verification-successfull.component';

describe('VerificationSuccessfullComponent', () => {
  let component: VerificationSuccessfullComponent;
  let fixture: ComponentFixture<VerificationSuccessfullComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VerificationSuccessfullComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VerificationSuccessfullComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
