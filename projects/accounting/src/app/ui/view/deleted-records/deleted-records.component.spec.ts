import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeletedRecordsComponent } from './deleted-records.component';

describe('DeletedRecordsComponent', () => {
  let component: DeletedRecordsComponent;
  let fixture: ComponentFixture<DeletedRecordsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeletedRecordsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DeletedRecordsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
