import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddPerDiemComponent } from './add-per-diem.component';

describe('AddPerDiemComponent', () => {
  let component: AddPerDiemComponent;
  let fixture: ComponentFixture<AddPerDiemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddPerDiemComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddPerDiemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
