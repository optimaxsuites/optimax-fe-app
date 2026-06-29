import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SmtpSetupComponent } from './smtp-setup.component';

describe('SmtpSetupComponent', () => {
  let component: SmtpSetupComponent;
  let fixture: ComponentFixture<SmtpSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SmtpSetupComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SmtpSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
