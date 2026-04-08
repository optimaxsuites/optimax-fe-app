import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminexportComponent } from './adminexport.component';

describe('AdminexportComponent', () => {
  let component: AdminexportComponent;
  let fixture: ComponentFixture<AdminexportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminexportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminexportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
