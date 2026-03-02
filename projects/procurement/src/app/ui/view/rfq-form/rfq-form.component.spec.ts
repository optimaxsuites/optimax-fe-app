import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RfqFormComponent } from './rfq-form.component';

describe('RfqFormComponent', () => {
  let component: RfqFormComponent;
  let fixture: ComponentFixture<RfqFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RfqFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RfqFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
