import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClinicalStagesComponent } from './clinicalstages.component';

describe('ClinicalStagesComponent', () => {
  let component: ClinicalStagesComponent;
  let fixture: ComponentFixture<ClinicalStagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClinicalStagesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ClinicalStagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
