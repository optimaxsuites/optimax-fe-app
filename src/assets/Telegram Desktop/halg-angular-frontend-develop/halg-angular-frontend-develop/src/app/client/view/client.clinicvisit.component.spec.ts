import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClinicvisitComponent } from './client.clinicvisit.component';

describe('ClinicvisitComponent', () => {
  let component: ClinicvisitComponent;
  let fixture: ComponentFixture<ClinicvisitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClinicvisitComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ClinicvisitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
