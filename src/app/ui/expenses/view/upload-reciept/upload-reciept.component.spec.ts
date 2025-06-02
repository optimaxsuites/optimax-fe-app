import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadRecieptComponent } from './upload-reciept.component';

describe('UploadRecieptComponent', () => {
  let component: UploadRecieptComponent;
  let fixture: ComponentFixture<UploadRecieptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UploadRecieptComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UploadRecieptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
