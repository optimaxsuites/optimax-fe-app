import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddProComponent } from './add-pro.component';

describe('AddProComponent', () => {
  let component: AddProComponent;
  let fixture: ComponentFixture<AddProComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddProComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddProComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
