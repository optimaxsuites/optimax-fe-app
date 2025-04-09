import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RfqModalComponent } from './rfq-modal.component';

describe('RfqModalComponent', () => {
  let component: RfqModalComponent;
  let fixture: ComponentFixture<RfqModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RfqModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RfqModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
