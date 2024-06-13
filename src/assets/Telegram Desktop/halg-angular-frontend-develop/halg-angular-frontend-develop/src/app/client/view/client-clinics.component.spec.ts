import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientClinicsComponent } from './client-clinics.component';

describe('ClientClinicsComponent', () => {
  let component: ClientClinicsComponent;
  let fixture: ComponentFixture<ClientClinicsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClientClinicsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ClientClinicsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
