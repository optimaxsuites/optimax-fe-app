import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddRfqItemComponent } from './add-rfq-item.component';

describe('AddRfqItemComponent', () => {
  let component: AddRfqItemComponent;
  let fixture: ComponentFixture<AddRfqItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddRfqItemComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddRfqItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
