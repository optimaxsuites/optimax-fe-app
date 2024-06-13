import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HivstatusatregistrationlistComponent } from './hivstatusatregistrationlist.component';

describe('HivstatusatregistrationlistComponent', () => {
  let component: HivstatusatregistrationlistComponent;
  let fixture: ComponentFixture<HivstatusatregistrationlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HivstatusatregistrationlistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HivstatusatregistrationlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
