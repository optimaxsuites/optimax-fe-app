import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CloseRegisterModalComponent } from './close-register-modal.component';

describe('CloseRegisterModalComponent', () => {
  let component: CloseRegisterModalComponent;
  let fixture: ComponentFixture<CloseRegisterModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CloseRegisterModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CloseRegisterModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
