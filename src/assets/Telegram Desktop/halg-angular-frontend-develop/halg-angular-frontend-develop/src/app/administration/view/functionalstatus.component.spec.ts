import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FunctionalStatusComponent } from './functionalstatus.component';

describe('FuntionalstatusComponent', () => {
  let component: FunctionalStatusComponent;
  let fixture: ComponentFixture<FunctionalStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FunctionalStatusComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FunctionalStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
